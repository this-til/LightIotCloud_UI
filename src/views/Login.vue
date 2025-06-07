<script setup lang="js">
import { ref, onMounted } from 'vue'
import RetrievePassword from '../components/RetrievePassword.vue'
import Registered from '../components/Registered.vue'
import { useRouter } from 'vue-router'
import { login } from '@/util/api.ts'
import { useGraphqlStore } from '@/util/store.js'
//初始化变量
const username = ref('')
const password = ref('')
const error = ref()
const router = useRouter()
const currentView = ref('index')
const currentViews = {
  recover: RetrievePassword,
  registered: Registered
}

//跳转不同的tab(界面)
const tabChoose = (value) => {
  currentView.value = value
}

//登录成功，跳转界面
const loginTab = async () => {
  const jwt = await login(username.value, password.value)

  const graphqlStore = useGraphqlStore()
  graphqlStore.setToken(jwt)
  await router.push({
    path: '/main'
  })

}
</script>

<template>
  <div class="big-box">
    <div class="mid-box">
      <div class="login-box" v-if="currentView === 'index'">
        <p class="login-title">登录</p>
        <div class="input-container">
          <input type="text" required="required" v-model="username"></input>
          <span>账号</span>
          <i></i>
        </div>
        <div class="input-container">
          <input type="password" required="required" v-model="password" @keydown.enter="loginTab"></input>
          <span>密码</span>
          <i></i>
        </div>
        <div style="color: red; margin-top: 10px;">{{ error }}</div>
        <input type="submit" value="登录" @click="loginTab"></input>
        <div class="bottom-right">
          <p class="getPassworde" @click="tabChoose('recover')">找回密码</p>
          <p class="registered" @click="tabChoose('registered')">注册</p>
        </div>
      </div>
      <component v-if="currentView !== 'index'" :is="currentViews[currentView]" @tabView="tabChoose"></component>
    </div>
  </div>
</template>

<style scoped>
.big-box {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #1c1c1c;
  border-radius: 8px;
}

.mid-box {
  width: 20%;
  height: 45%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-sizing: border-box; /* 确保宽高计算包含边框和内边距 */
  inset: 2px;
  background-color: #1c1c1c;
  border-radius: 8px;
  overflow: hidden;
}

.mid-box::before {
  width: 40%;
  height: 75%;
  content: '';
  position: absolute;
  top: -30%;
  left: 0%;
  background: linear-gradient(0deg, transparent, #45f3ff, #45f3ff);
  transform-origin: bottom right;
  animation: animate 6s linear infinite;
}

.mid-box::after {
  width: 40%;
  height: 75%;
  content: '';
  position: absolute;
  top: -30%;
  left: 0%;
  background: linear-gradient(0deg, transparent, #45f3ff, #45f3ff);
  transform-origin: bottom right;
  animation: animate 6s linear infinite;
  animation-delay: -3s;
}

@keyframes animate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.login-box {
  position: absolute;
  inset: 0.7%;
  border-radius: 8px;
  background: #28292d;
  z-index: 10;
  padding: 10% 10%;
  display: flex;
  flex-direction: column;
}

.login-title {
  color: #45f3ff;
  text-align: center;
  letter-spacing: 0.1em;
  font-size: 2em;
  padding-top: 5%;
  padding-bottom: 0%;
}

.input-container {
  position: relative;
  margin-top: 8%;
  display: flex;
  flex-direction: column;
  gap: 10%;
}

.input-container input {
  position: relative;
  padding: 10% 5% 5%;
  background: transparent;
  border: none;
  outline: none;
  color: #23242a;
  font-size: 1em;
  letter-spacing: 0.05em;
  z-index: 10;
}

.input-container span {
  position: absolute;
  left: 0;
  padding: 9% 0% 5%;
  font-size: 1em;
  color: #8f8f8f;
  pointer-events: none;
  letter-spacing: 0.05em;
  transition: 0.5s;
}

.input-container input:valid ~ span,
.input-container input:focus ~ span {
  color: #45f3ff;
  transform: translateX(0px) translateY(-34px);
  font-size: 0.75em;
}

.input-container i {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 4%;
  background: #45f3ff;
  border-radius: 4px;
  transition: 0.5s;
  pointer-events: none;
  z-index: 9;
}

.input-container input:valid ~ i,
.input-container input:focus ~ i {
  height: 60%;
}

input[type='submit'] {
  border: none;
  outline: none;
  background: #45f3ff;
  padding: 4% 5%;
  width: 28%;
  margin: 9% auto;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
}

input[type='submit']:active {
  opacity: 0.8;
}

.bottom-right {
  display: flex;
  gap: 1em;
  position: absolute;
  bottom: 5%;
  right: 10%;
}

.getPassworde, .registered {
  font-size: 1em;
  color: #8f8f8f;
  cursor: pointer;
  transition: color 0.3s ease-in-out;
}

.getPassworde:hover, .registered:hover {
  color: #00bcd4;
}

.getPassworde:active, .registered:active {
  color: #beecf1;
}
</style>