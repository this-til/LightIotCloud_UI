<template>
  <div class="intercom-container">
    <div class="intercom-content sci-fi">
      <!-- 对讲配置 -->
      <div class="config-section">
        <div class="section-header">
          <h2>对讲配置</h2>
        </div>
        
        <div class="config-grid">
          <!-- 音频设备选择 -->
          <div class="config-card">
            <div class="card-header">
              <el-icon class="card-icon">
                <Microphone />
              </el-icon>
              <span>音频设备</span>
            </div>
            <div class="card-content">
              <div class="device-item">
                <label>输入设备（麦克风）:</label>
                <el-select v-model="selectedMicrophone" :disabled="!device.online" class="device-select">
                  <el-option 
                    v-for="device in audioInputDevices" 
                    :key="device.deviceId" 
                    :label="device.label || '未知设备'" 
                    :value="device.deviceId" 
                  />
                </el-select>
              </div>
              <div class="device-item">
                <label>输出设备（扬声器）:</label>
                <el-select v-model="selectedSpeaker" :disabled="!device.online" class="device-select">
                  <el-option 
                    v-for="device in audioOutputDevices" 
                    :key="device.deviceId" 
                    :label="device.label || '未知设备'" 
                    :value="device.deviceId" 
                  />
                </el-select>
              </div>
            </div>
          </div>

          <!-- 音量控制 -->
          <div class="config-card">
            <div class="card-header">
              <el-icon class="card-icon">
                <TurnOff />
              </el-icon>
              <span>音量控制</span>
            </div>
            <div class="card-content">
              <div class="volume-item">
                <div class="volume-label">
                  <span>麦克风音量</span>
                  <span class="volume-value">{{ microphoneVolume }}%</span>
                </div>
                <el-slider 
                  v-model="microphoneVolume" 
                  :min="0" 
                  :max="100" 
                  :disabled="!device.online"
                  @change="handleMicrophoneVolumeChange"
                  class="volume-slider"
                />
              </div>
              <div class="volume-item">
                <div class="volume-label">
                  <span>扬声器音量</span>
                  <span class="volume-value">{{ speakerVolume }}%</span>
                </div>
                <el-slider 
                  v-model="speakerVolume" 
                  :min="0" 
                  :max="100" 
                  :disabled="!device.online"
                  @change="handleSpeakerVolumeChange"
                  class="volume-slider"
                />
              </div>
            </div>
          </div>

          <!-- 对讲模式 -->
          <div class="config-card">
            <div class="card-header">
              <el-icon class="card-icon">
                <ChatDotRound />
              </el-icon>
              <span>对讲模式</span>
            </div>
            <div class="card-content">
              <div class="mode-item">
                <el-radio-group v-model="intercomMode" @change="handleIntercomModeChange" :disabled="!device.online">
                  <el-radio label="push-to-talk">按键对讲</el-radio>
                  <el-radio label="voice-activated">声控对讲</el-radio>
                  <el-radio label="full-duplex">全双工对讲</el-radio>
                </el-radio-group>
              </div>
              
              <!-- 声控阈值设置 -->
              <div v-if="intercomMode === 'voice-activated'" class="threshold-item">
                <div class="volume-label">
                  <span>声控阈值</span>
                  <span class="volume-value">{{ voiceThreshold }}%</span>
                </div>
                <el-slider 
                  v-model="voiceThreshold" 
                  :min="0" 
                  :max="100" 
                  :disabled="!device.online"
                  @change="handleVoiceThresholdChange"
                  class="volume-slider"
                />
              </div>
            </div>
          </div>

          <!-- 音频质量设置 -->
          <div class="config-card">
            <div class="card-header">
              <el-icon class="card-icon">
                <Setting />
              </el-icon>
              <span>音频质量</span>
            </div>
            <div class="card-content">
              <div class="quality-item">
                <label>采样率:</label>
                <el-select v-model="sampleRate" @change="handleSampleRateChange" :disabled="!device.online" class="quality-select">
                  <el-option label="8 kHz" value="8000" />
                  <el-option label="16 kHz" value="16000" />
                  <el-option label="22.05 kHz" value="22050" />
                  <el-option label="44.1 kHz" value="44100" />
                  <el-option label="48 kHz" value="48000" />
                </el-select>
              </div>
              <div class="quality-item">
                <label>音频编码:</label>
                <el-select v-model="audioCodec" @change="handleAudioCodecChange" :disabled="!device.online" class="quality-select">
                  <el-option label="PCM" value="pcm" />
                  <el-option label="AAC" value="aac" />
                  <el-option label="Opus" value="opus" />
                  <el-option label="G.711" value="g711" />
                </el-select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 对讲测试 -->
      <div class="test-section">
        <div class="section-header">
          <h2>对讲测试</h2>
        </div>
        
        <div class="test-controls">
          <div class="test-buttons">
            <el-button 
              type="primary" 
              @click="startIntercomTest" 
              :disabled="!device.online || isTestActive"
              class="test-btn"
            >
              <el-icon><Microphone /></el-icon>
              开始测试
            </el-button>
            <el-button 
              type="danger" 
              @click="stopIntercomTest" 
              :disabled="!device.online || !isTestActive"
              class="test-btn"
            >
              <el-icon><TurnOff /></el-icon>
              停止测试
            </el-button>
            <el-button 
              @click="refreshDevices" 
              :disabled="!device.online"
              class="test-btn"
            >
              <el-icon><Refresh /></el-icon>
              刷新设备
            </el-button>
          </div>
          
          <!-- 音频级别指示器 -->
          <div class="audio-level">
            <div class="level-label">音频输入级别:</div>
            <div class="level-meter">
              <div class="level-bar" :style="{ width: audioInputLevel + '%' }"></div>
            </div>
            <span class="level-text">{{ audioInputLevel }}%</span>
          </div>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="quick-actions">
        <el-button 
          type="success" 
          @click="saveConfiguration" 
          :disabled="!device.online"
          class="action-btn"
        >
          <el-icon><Check /></el-icon>
          保存配置
        </el-button>
        <el-button 
          @click="resetToDefault" 
          :disabled="!device.online"
          class="action-btn"
        >
          <el-icon><RefreshLeft /></el-icon>
          恢复默认
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { 
  Microphone, TurnOff, ChatDotRound, Setting, 
  Check, RefreshLeft, Refresh 
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  device: Object
})

const route = useRoute()

// 音频设备
const audioInputDevices = ref([])
const audioOutputDevices = ref([])
const selectedMicrophone = ref('')
const selectedSpeaker = ref('')

// 音量控制
const microphoneVolume = ref(80)
const speakerVolume = ref(70)

// 对讲模式
const intercomMode = ref('push-to-talk')
const voiceThreshold = ref(30)

// 音频质量
const sampleRate = ref('16000')
const audioCodec = ref('opus')

// 测试状态
const isTestActive = ref(false)
const audioInputLevel = ref(0)

// 模拟音频级别更新
let audioLevelInterval = null

onMounted(async () => {
  const deviceId = props.device?.id || route.query.id
  console.log('对讲配置页面加载, 设备ID:', deviceId)
  
  // 获取音频设备列表
  await getAudioDevices()
  
  // 模拟音频输入级别
  startAudioLevelMonitoring()
})

onUnmounted(() => {
  stopAudioLevelMonitoring()
  if (isTestActive.value) {
    stopIntercomTest()
  }
})

// 获取音频设备列表
const getAudioDevices = async () => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      ElMessage.warning('当前浏览器不支持音频设备枚举')
      return
    }

    const devices = await navigator.mediaDevices.enumerateDevices()
    
    audioInputDevices.value = devices.filter(device => device.kind === 'audioinput')
    audioOutputDevices.value = devices.filter(device => device.kind === 'audiooutput')
    
    // 设置默认设备
    if (audioInputDevices.value.length > 0 && !selectedMicrophone.value) {
      selectedMicrophone.value = audioInputDevices.value[0].deviceId
    }
    if (audioOutputDevices.value.length > 0 && !selectedSpeaker.value) {
      selectedSpeaker.value = audioOutputDevices.value[0].deviceId
    }
    
  } catch (error) {
    console.error('获取音频设备失败:', error)
    ElMessage.error('获取音频设备列表失败')
  }
}

// 音量控制处理
const handleMicrophoneVolumeChange = (value) => {
  console.log('麦克风音量设置:', value)
  // TODO: 调用API设置麦克风音量
  ElMessage.success(`麦克风音量已设置为 ${value}%`)
}

const handleSpeakerVolumeChange = (value) => {
  console.log('扬声器音量设置:', value)
  // TODO: 调用API设置扬声器音量
  ElMessage.success(`扬声器音量已设置为 ${value}%`)
}

// 对讲模式处理
const handleIntercomModeChange = (value) => {
  console.log('对讲模式设置:', value)
  // TODO: 调用API设置对讲模式
  ElMessage.success(`对讲模式已设置为 ${getIntercomModeName(value)}`)
}

const handleVoiceThresholdChange = (value) => {
  console.log('声控阈值设置:', value)
  // TODO: 调用API设置声控阈值
}

// 音频质量处理
const handleSampleRateChange = (value) => {
  console.log('采样率设置:', value)
  // TODO: 调用API设置采样率
  ElMessage.success(`采样率已设置为 ${value} Hz`)
}

const handleAudioCodecChange = (value) => {
  console.log('音频编码设置:', value)
  // TODO: 调用API设置音频编码
  ElMessage.success(`音频编码已设置为 ${value.toUpperCase()}`)
}

// 对讲测试
const startIntercomTest = async () => {
  try {
    // TODO: 实现对讲测试逻辑
    isTestActive.value = true
    ElMessage.success('对讲测试已开始')
    
    // 模拟测试过程
    console.log('开始对讲测试...')
    
  } catch (error) {
    console.error('对讲测试启动失败:', error)
    ElMessage.error('对讲测试启动失败')
  }
}

const stopIntercomTest = () => {
  try {
    // TODO: 停止对讲测试
    isTestActive.value = false
    ElMessage.success('对讲测试已停止')
    
    console.log('停止对讲测试')
    
  } catch (error) {
    console.error('对讲测试停止失败:', error)
    ElMessage.error('对讲测试停止失败')
  }
}

const refreshDevices = async () => {
  try {
    await getAudioDevices()
    ElMessage.success('音频设备列表已刷新')
  } catch (error) {
    ElMessage.error('刷新设备列表失败')
  }
}

// 配置保存
const saveConfiguration = () => {
  try {
    const config = {
      microphone: selectedMicrophone.value,
      speaker: selectedSpeaker.value,
      microphoneVolume: microphoneVolume.value,
      speakerVolume: speakerVolume.value,
      intercomMode: intercomMode.value,
      voiceThreshold: voiceThreshold.value,
      sampleRate: sampleRate.value,
      audioCodec: audioCodec.value
    }
    
    console.log('保存对讲配置:', config)
    // TODO: 调用API保存配置
    
    ElMessage.success('对讲配置已保存')
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存配置失败')
  }
}

const resetToDefault = () => {
  try {
    microphoneVolume.value = 80
    speakerVolume.value = 70
    intercomMode.value = 'push-to-talk'
    voiceThreshold.value = 30
    sampleRate.value = '16000'
    audioCodec.value = 'opus'
    
    ElMessage.success('已恢复为默认配置')
  } catch (error) {
    ElMessage.error('恢复默认配置失败')
  }
}

// 辅助函数
const getIntercomModeName = (mode) => {
  const modeMap = {
    'push-to-talk': '按键对讲',
    'voice-activated': '声控对讲',
    'full-duplex': '全双工对讲'
  }
  return modeMap[mode] || mode
}

// 音频级别监控
const startAudioLevelMonitoring = () => {
  audioLevelInterval = setInterval(() => {
    if (isTestActive.value) {
      // 模拟音频输入级别变化
      audioInputLevel.value = Math.floor(Math.random() * 100)
    } else {
      audioInputLevel.value = 0
    }
  }, 100)
}

const stopAudioLevelMonitoring = () => {
  if (audioLevelInterval) {
    clearInterval(audioLevelInterval)
    audioLevelInterval = null
  }
}
</script>

<style scoped>
.intercom-container {
  padding: 20px;
  min-height: 100vh;
}

.intercom-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.config-section,
.test-section {
  background: rgba(20, 25, 45, .9);
  border: 1px solid #06f6f1;
  box-shadow: 0 0 8px #06f6f1;
  border-radius: 12px;
  padding: 20px;
}

.section-header {
  margin-bottom: 20px;
}

.section-header h2 {
  color: #00ffea;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  border-bottom: 1px solid rgba(6, 246, 241, .4);
  padding-bottom: 8px;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px;
}

.config-card {
  background: rgba(0, 10, 20, .6);
  border: 1px solid rgba(0, 255, 234, .3);
  border-radius: 8px;
  padding: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  color: #8fe8ff;
  font-weight: 500;
}

.card-icon {
  color: #00b4ff;
  font-size: 18px;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.device-item,
.quality-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.device-item label,
.quality-item label {
  color: #c8feff;
  font-size: 14px;
}

.device-select,
.quality-select {
  width: 100%;
}

.volume-item,
.threshold-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.volume-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #c8feff;
  font-size: 14px;
}

.volume-value {
  color: #00ffea;
  font-weight: 600;
}

.volume-slider {
  margin: 0;
}

.mode-item {
  margin-bottom: 16px;
}

.test-controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.test-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.test-btn,
.action-btn {
  height: 40px;
  min-width: 120px;
  background: rgba(0, 10, 20, .9);
  border: 1px solid rgba(0, 255, 234, .4);
  color: #8fe8ff;
  box-shadow: 0 0 4px rgba(0, 255, 234, .4);
}

.test-btn:hover,
.action-btn:hover {
  color: #00ffea;
  box-shadow: 0 0 8px #00ffea;
  background: rgba(0, 10, 20, 1);
}

.audio-level {
  display: flex;
  align-items: center;
  gap: 12px;
}

.level-label {
  color: #8fe8ff;
  font-size: 14px;
  min-width: 100px;
}

.level-meter {
  flex: 1;
  height: 20px;
  background: rgba(0, 255, 234, .2);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.level-bar {
  height: 100%;
  background: linear-gradient(90deg, #00ff88 0%, #ffff00 50%, #ff4444 100%);
  transition: width 0.1s ease;
  border-radius: 10px;
}

.level-text {
  color: #00ffea;
  font-weight: 600;
  min-width: 40px;
}

.quick-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
}

/* Element UI 组件科技风格样式 */

/* ===== Select 选择器样式 ===== */
:deep(.el-select .el-input__inner) {
  background: rgba(0, 10, 20, .85);
  border: 1px solid rgba(0, 255, 234, .5);
  color: #c8feff;
  box-shadow: 0 0 4px rgba(0, 255, 234, .2) inset;
  transition: all 0.3s ease;
}

:deep(.el-select .el-input__inner:hover) {
  border-color: #00ffea;
  box-shadow: 0 0 6px rgba(0, 255, 234, .4);
}

:deep(.el-select .el-input__inner:focus) {
  border-color: #00ffea;
  box-shadow: 0 0 10px #00ffea;
}

:deep(.el-select .el-input__suffix) {
  color: #00ffea;
}

:deep(.el-select-dropdown) {
  background: rgba(0, 10, 20, .95);
  border: 1px solid #00d8ff;
  box-shadow: 0 0 15px #00d8ff;
}

:deep(.el-select-dropdown__item) {
  color: #c8feff;
  background: transparent;
}

:deep(.el-select-dropdown__item:hover) {
  background: rgba(0, 255, 234, .2);
  color: #00ffea;
}

:deep(.el-select-dropdown__item.selected) {
  background: rgba(0, 255, 234, .3);
  color: #00ffea;
  font-weight: 600;
}

/* ===== Slider 滑块样式 ===== */
:deep(.el-slider .el-slider__runway) {
  background: rgba(0, 255, 234, .15);
  border: 1px solid rgba(0, 255, 234, .3);
  box-shadow: 0 0 4px rgba(0, 255, 234, .2) inset;
}

:deep(.el-slider .el-slider__bar) {
  background: linear-gradient(90deg, #00ffff 0%, #00d8ff 100%);
  box-shadow: 0 0 8px rgba(0, 255, 234, .6);
}

:deep(.el-slider .el-slider__button) {
  width: 16px;
  height: 16px;
  border: 2px solid #00ffff;
  background: #001018;
  box-shadow: 0 0 8px #00ffff;
  transition: all 0.3s ease;
}

:deep(.el-slider .el-slider__button:hover) {
  transform: scale(1.2);
  box-shadow: 0 0 12px #00ffff;
}

:deep(.el-slider.is-disabled .el-slider__runway) {
  background: rgba(255, 255, 255, .08);
  border-color: rgba(255, 255, 255, .15);
}

:deep(.el-slider.is-disabled .el-slider__bar) {
  background: rgba(255, 255, 255, .2);
  box-shadow: none;
}

:deep(.el-slider.is-disabled .el-slider__button) {
  border-color: rgba(255, 255, 255, .3);
  box-shadow: none;
}

/* ===== Radio 单选框样式 ===== */
:deep(.el-radio) {
  margin-right: 20px;
  margin-bottom: 12px;
}

:deep(.el-radio__input .el-radio__inner) {
  border: 2px solid rgba(0, 255, 234, .5);
  background: rgba(0, 10, 20, .8);
  width: 16px;
  height: 16px;
}

:deep(.el-radio__input:hover .el-radio__inner) {
  border-color: #00ffea;
  box-shadow: 0 0 6px rgba(0, 255, 234, .4);
}

:deep(.el-radio__input.is-checked .el-radio__inner) {
  background: #00ffff;
  border-color: #00ffff;
  box-shadow: 0 0 10px rgba(0, 255, 255, .6);
}

:deep(.el-radio__input.is-checked .el-radio__inner::after) {
  width: 6px;
  height: 6px;
  background: #001018;
}

:deep(.el-radio__label) {
  color: #c8feff;
  font-size: 14px;
  padding-left: 8px;
  transition: color 0.3s ease;
}

:deep(.el-radio__input.is-checked + .el-radio__label) {
  color: #00ffea;
  text-shadow: 0 0 3px rgba(0, 255, 234, .5);
}

:deep(.el-radio.is-disabled .el-radio__inner) {
  background: rgba(255, 255, 255, .05);
  border-color: rgba(255, 255, 255, .2);
}

:deep(.el-radio.is-disabled .el-radio__label) {
  color: rgba(255, 255, 255, .3);
}

/* ===== Button 按钮增强样式 ===== */
:deep(.el-button) {
  transition: all 0.3s ease;
  font-weight: 500;
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, rgba(0, 255, 234, .8) 0%, rgba(0, 216, 255, .6) 100%);
  border: 1px solid #00ffea;
  color: #001018;
  box-shadow: 0 0 8px rgba(0, 255, 234, .4);
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #00ffea 0%, #00d8ff 100%);
  box-shadow: 0 0 15px rgba(0, 255, 234, .7);
  transform: translateY(-1px);
}

:deep(.el-button--danger) {
  background: linear-gradient(135deg, rgba(255, 87, 87, .8) 0%, rgba(255, 71, 87, .6) 100%);
  border: 1px solid #ff6b6b;
  color: #ffffff;
  box-shadow: 0 0 8px rgba(255, 107, 107, .4);
}

:deep(.el-button--danger:hover) {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff4757 100%);
  box-shadow: 0 0 15px rgba(255, 107, 107, .7);
  transform: translateY(-1px);
}

:deep(.el-button--success) {
  background: linear-gradient(135deg, rgba(0, 255, 136, .8) 0%, rgba(0, 216, 255, .6) 100%);
  border: 1px solid #00ff88;
  color: #001018;
  box-shadow: 0 0 8px rgba(0, 255, 136, .4);
}

:deep(.el-button--success:hover) {
  background: linear-gradient(135deg, #00ff88 0%, #00d8ff 100%);
  box-shadow: 0 0 15px rgba(0, 255, 136, .7);
  transform: translateY(-1px);
}

:deep(.el-button.is-disabled) {
  background: rgba(255, 255, 255, .05) !important;
  border-color: rgba(255, 255, 255, .2) !important;
  color: rgba(255, 255, 255, .3) !important;
  box-shadow: none !important;
  transform: none !important;
}

/* 响应式 */
@media (max-width: 768px) {
  .config-grid {
    grid-template-columns: 1fr;
  }
  
  .test-buttons {
    flex-direction: column;
  }
  
  .quick-actions {
    flex-direction: column;
  }
  
  .audio-level {
    flex-direction: column;
    align-items: stretch;
  }
}
</style> 