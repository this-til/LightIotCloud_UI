<template>
  <div class="car-control-container">
    <div class="control-panel">
      <h3 class="panel-title">车辆远程操控</h3>

      <div class="control-sections">
        <!-- 平移控制 -->
        <div class="control-section">
          <h4 class="section-title">平移控制</h4>
          <div class="direction-controls">
            <el-button class="direction-btn up-btn" :disabled="!car?.online"
              @mousedown="startContinuousControl('translationAdvance')" @mouseup="stopContinuousControl"
              @mouseleave="stopContinuousControl" @touchstart="startContinuousControl('translationAdvance')"
              @touchend="stopContinuousControl">
              <el-icon>
                <CaretTop />
              </el-icon>
              <span>前进 (W)</span>
            </el-button>
            <div class="middle-row">
              <el-button class="direction-btn left-btn" :disabled="!car?.online"
                @mousedown="startContinuousControl('translationLeft')" @mouseup="stopContinuousControl"
                @mouseleave="stopContinuousControl" @touchstart="startContinuousControl('translationLeft')"
                @touchend="stopContinuousControl">
                <el-icon>
                  <CaretLeft />
                </el-icon>
                <span>左移 (A)</span>
              </el-button>
              <el-button class="direction-btn right-btn" :disabled="!car?.online"
                @mousedown="startContinuousControl('translationRight')" @mouseup="stopContinuousControl"
                @mouseleave="stopContinuousControl" @touchstart="startContinuousControl('translationRight')"
                @touchend="stopContinuousControl">
                <el-icon>
                  <CaretRight />
                </el-icon>
                <span>右移 (D)</span>
              </el-button>
            </div>
            <el-button class="direction-btn down-btn" :disabled="!car?.online"
              @mousedown="startContinuousControl('translationRetreat')" @mouseup="stopContinuousControl"
              @mouseleave="stopContinuousControl" @touchstart="startContinuousControl('translationRetreat')"
              @touchend="stopContinuousControl">
              <el-icon>
                <CaretBottom />
              </el-icon>
              <span>后退 (S)</span>
            </el-button>
          </div>
        </div>

        <!-- 旋转控制 -->
        <div class="control-section">
          <h4 class="section-title">旋转控制</h4>
          <div class="angular-controls">
            <el-button class="angular-btn" :disabled="!car?.online" @mousedown="startContinuousControl('angularLeft')"
              @mouseup="stopContinuousControl" @mouseleave="stopContinuousControl"
              @touchstart="startContinuousControl('angularLeft')" @touchend="stopContinuousControl">
              <el-icon>
                <RefreshLeft />
              </el-icon>
              <span>左转 (Q)</span>
            </el-button>
            <el-button class="angular-btn" :disabled="!car?.online" @mousedown="startContinuousControl('angularRight')"
              @mouseup="stopContinuousControl" @mouseleave="stopContinuousControl"
              @touchstart="startContinuousControl('angularRight')" @touchend="stopContinuousControl">
              <el-icon>
                <RefreshRight />
              </el-icon>
              <span>右转 (E)</span>
            </el-button>
          </div>
        </div>

        <!-- 停止控制 -->
        <div class="control-section">
          <h4 class="section-title">停止控制</h4>
          <el-button class="stop-btn" type="danger" :disabled="!car?.online" @click="handleOperation('stop')">
            <el-icon>
              <VideoPause />
            </el-icon>
            <span>停止 (空格)</span>
          </el-button>
        </div>
      </div>

      <div class="status-info">
        <div class="status-item">
          <span>设备状态:</span>
          <span :class="['status-value', car?.online ? 'online' : 'offline']">
            {{ car?.online ? '在线' : '离线' }}
          </span>
        </div>
        <div class="keyboard-hints">
          <p>键盘操控: W前进 S后退 A左移 D右移 Q左转 E右转 空格停止</p>
        </div>
      </div>
    </div>
    <div class="model-view">
      <CarScene ref="sceneRef" />
      <!-- 之类 -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  CaretTop,
  CaretBottom,
  CaretLeft,
  CaretRight,
  RefreshLeft,
  RefreshRight,
  VideoPause
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getCarById, operationCar } from '@/util/Api'
import CarScene from '@/components/CarScene.vue'

const route = useRoute()
const car = ref(null)
const sceneRef = ref(null)
let operationTimer = null
let currentOp = null

// 远程控制请求
async function controlCar(op) {
  const carId = Number(route.query.id)
  if (!carId) {
    ElMessage.warning('设备ID无效')
    return
  }
  if (!car.value?.online) {
    ElMessage.warning('设备不在线，无法操控')
    return
  }
  try {
    const res = await operationCar(carId, op)
    if (res.resultType !== 'SUCCESSFUL') {
      ElMessage.error(`操作失败: ${res.message || '未知错误'}`)
    }
  } catch {
    ElMessage.error('操控请求失败，请检查网络连接')
  }
}

// 开始持续控制：同时控制 API 与 3D 场景
function startContinuousControl(op) {
  stopContinuousControl()
  currentOp = op
  controlCar(op)
  const keyMap = {
    translationAdvance: 'KeyW',
    translationRetreat: 'KeyS',
    translationLeft: 'KeyA',
    translationRight: 'KeyD',
    angularLeft: 'KeyQ',
    angularRight: 'KeyE'
  }
  const code = keyMap[op]
  sceneRef.value?.pressKey(code)
  operationTimer = setInterval(() => controlCar(op), 250)
}

// 停止持续控制：清除定时器以及释放 3D 场景按键
function stopContinuousControl() {
  if (currentOp) {
    const keyMap = {
      translationAdvance: 'KeyW',
      translationRetreat: 'KeyS',
      translationLeft: 'KeyA',
      translationRight: 'KeyD',
      angularLeft: 'KeyQ',
      angularRight: 'KeyE'
    }
    const code = keyMap[currentOp]
    sceneRef.value?.releaseKey(code)
  }
  clearInterval(operationTimer)
  operationTimer = null
  currentOp = null
}

// 单次停止按钮
async function handleOperation(op) {
  await controlCar(op)
}

// 键盘事件处理
function handleKeyDown(e) {
  if (currentOp) return
  const tag = e.target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  switch (e.key.toLowerCase()) {
    case 'w': e.preventDefault(); startContinuousControl('translationAdvance'); break
    case 's': e.preventDefault(); startContinuousControl('translationRetreat'); break
    case 'a': e.preventDefault(); startContinuousControl('translationLeft'); break
    case 'd': e.preventDefault(); startContinuousControl('translationRight'); break
    case 'q': e.preventDefault(); startContinuousControl('angularLeft'); break
    case 'e': e.preventDefault(); startContinuousControl('angularRight'); break
    case ' ': e.preventDefault(); handleOperation('stop'); break
  }
}

function handleKeyUp(e) {
  const mapKey = {
    w: 'translationAdvance',
    s: 'translationRetreat',
    a: 'translationLeft',
    d: 'translationRight',
    q: 'angularLeft',
    e: 'angularRight'
  }
  const cmd = mapKey[e.key.toLowerCase()]
  if (cmd === currentOp) stopContinuousControl()
}

onMounted(async () => {
  const id = Number(route.query.id)
  if (id) car.value = await getCarById(id)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  stopContinuousControl()
})
</script>

<style scoped>
.car-control-container {
  /* 深色星舰舱壁 */
  background: #0a0f1e;
  display: flex;
  justify-content: center;
  padding: 32px;
  height: 100%;
  flex-direction: row;
}

.control-panel {
  flex: 0 0 380px;
  padding: 32px 40px;
  overflow-y: auto;
  background: rgba(10, 15, 30, 0.85);
  border: 1px solid #06f6f1;
  border-right: none;
  border-radius: 0 18px 18px 0;
  box-shadow: 3px 0 14px rgba(0, 255, 234, .25),
    inset 0 0 6px rgba(0, 255, 234, .25);
}

.model-view {
  flex: 1 1 0;
  position: relative;
  overflow: hidden;
  /* 视觉占位：暗蓝网格，可删 */
  background:
    radial-gradient(circle at center,
      rgba(0, 255, 234, .12) 0%,
      rgba(0, 255, 234, .02) 40%,
      transparent 70%) center/120% 120%,
    repeating-linear-gradient(rgba(0, 255, 234, .05) 0 1px, transparent 1px 60px),
    repeating-linear-gradient(90deg, rgba(0, 255, 234, .05) 0 1px, transparent 1px 60px),
    #070c16;
  border-left: 1px solid #06f6f1;
}

/* ------- 若面板高度超屏，可滚动但隐藏滚动条 ------- */
.control-panel::-webkit-scrollbar {
  width: 0;
  height: 0;
}

/* ================= 标题 ================= */
.panel-title {
  margin: 0 0 26px;
  text-align: center;
  font-size: 26px;
  font-weight: 800;
  color: #00ffff;
  position: relative;
}

.panel-title::after {
  content: '';
  display: block;
  width: 180px;
  height: 2px;
  margin: 14px auto 0;
  background: linear-gradient(90deg, transparent, #00ffff 45%, transparent);
  filter: drop-shadow(0 0 6px #00ffff);
}

/* ================= 分段盒子 ================= */
.control-section {
  border: 1px solid rgba(0, 255, 234, 0.35);
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 24px;
  background: rgba(0, 255, 234, 0.05);
  box-shadow: inset 0 0 6px rgba(0, 255, 234, 0.25);
}

.section-title {
  margin: 0 0 18px;
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  color: #00ffff;
}

/* ================= 通用按钮底样式 ================= */
.direction-btn,
.angular-btn,
.stop-btn {
  border-radius: 10px !important;
  font-size: 13px;
  font-weight: 600;
  color: #e6fcff;
  background: rgba(0, 255, 234, 0.15);
  border: 1px solid #00ffea;
  transition: transform .18s, box-shadow .18s, filter .2s;
}

.direction-btn:disabled,
.angular-btn:disabled,
.stop-btn:disabled {
  opacity: .35;
  filter: grayscale(0.6);
}

/* ================= 方向按钮 ================= */
.direction-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.middle-row {
  display: flex;
  gap: 60px;
}

.direction-btn {
  width: 110px;
  height: 58px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.direction-btn:hover:not(:disabled),
.direction-btn:focus-visible:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 0 10px #00ffea;
}

/* ================= 旋转按钮 ================= */
.angular-controls {
  display: flex;
  justify-content: center;
  gap: 48px;
}

.angular-btn {
  width: 140px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.angular-btn:hover:not(:disabled) {
  transform: translateY(-2px) rotateZ(-1deg);
  box-shadow: 0 0 10px #00ffea;
}

/* ================= 停止按钮 ================= */
.stop-btn {
  width: 200px;
  height: 66px;
  margin: 0 auto;
  color: #fff;
  background: rgba(245, 108, 108, 0.18);
  border: 1px solid #f56c6c;
}

.stop-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 0 14px #f56c6c;
}

/* ================= 状态 & 文案 ================= */
.status-info {
  margin-top: 18px;
  padding: 16px;
  text-align: center;
  border: 1px solid rgba(0, 255, 234, 0.35);
  border-radius: 10px;
  background: rgba(0, 255, 234, 0.05);
  box-shadow: inset 0 0 4px rgba(0, 255, 234, 0.3);
  color: #e6fcff;
  font-size: 14px;
}

.status-value.online {
  color: #00e676;
  text-shadow: 0 0 6px #00e676;
}

.status-value.offline {
  color: #ff5252;
  text-shadow: 0 0 6px #ff5252;
}

.keyboard-hints {
  margin-top: 6px;
  color: #8ab8ff;
  font-size: 12px;
  line-height: 1.4;
}
</style>
