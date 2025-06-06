<script setup>
import { ref, onMounted, defineEmits  } from 'vue'

const login = ref('')
const password = ref('')
const emit = defineEmits(['tabView'])
const back = () => {
    emit('tabView', 'index')
}
</script>

<template>
    <div class="registered-box">
        <p class="registered-title">注册界面</p>
        <input type="back-btn" @click="back" class="back-btn" value="返回"></input>
        <div class="input-container">
            <input v-model="login" required="required"></input>
            <span>账号</span>
            <i></i>
        </div>
        <div class="input-container">
            <input v-model="password" required="required"></input>
            <span>密码</span>
            <i></i>
        </div>
        <div class="input-container">
            <input v-model="password" required="required"></input>
            <span>确认密码</span>
            <i></i>
        </div>
        <input type="submit" value="注册"></input>
    </div>
</template>

<style scoped>
.registered-box{
    position: absolute;
    inset:2px;
    border-radius: 8px;
    background: #28292d;
    z-index: 10;
    padding: 50px 40px;
    display: flex;
    flex-direction: column;
}

.registered-title{
    color: #45f3ff;
    text-align: center;
    letter-spacing: 0.1em;
    font-size: 1.5em;
    padding-top: 6%;
    padding-bottom: 6%;
}
.back-btn{
    position: absolute;
}

input[type='back-btn']{
    position: absolute;
    border: none;
    outline: none;
    border: 1px solid #45f3ff;
    color: #45f3ff;
    background:  #28292d;
    justify-items: center;
    padding: 3% 9%;
    width: 20%;
    margin: 5% auto;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
}

input[type='back-btn']:active{
    opacity: 0.8;
}

.input-container {
    position: relative;
    margin-top: 4%;
    display: flex;
    flex-direction: column;
    gap: 1em;
}
.input-container input {
    position: relative;
    padding: 11% 10% 3% ;
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
    padding: 8% 0% 13% ;
    font-size: 1em;
    color: #8f8f8f;
    pointer-events: none;
    letter-spacing: 0.05em;
    transition: 0.5s;
}
.input-container input:valid ~ span,
.input-container input:focus ~ span
{
    color: #45f3ff;
    transform: translateX(0px) translateY(-34px);
    font-size: 0.85em;
}
.input-container i {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 1%;
    background: #45f3ff;
    border-radius: 4px;
    transition: 0.5s;
    pointer-events: none;
    z-index: 9;
}
.input-container input:valid ~ i,
.input-container input:focus ~ i
{
    height: 60%;
}
input[type='submit']{
    align-items: center;
    border: none;
    outline: none;
    background: #45f3ff;
    padding: 4% 10%;
    width: 28%;
    margin: 10% auto;
    border-radius: 4px;
    font-weight: 600;
    font-size: 1em;
    cursor: pointer;
}
input[type='submit']:active{
    opacity: 0.8;
}
</style>