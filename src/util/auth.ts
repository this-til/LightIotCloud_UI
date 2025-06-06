// 存储的 token 键名
const TOKEN_KEY = "auth_token";

// 获取令牌
export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

// 设置令牌
export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

// 移除令牌
export function removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

// 检查令牌是否有效（基础校验）
export function isTokenValid(token: string | null): boolean {
    if (!token) {
        return false
    }

    try {
        // 解析 JWT 载荷
        const payload = JSON.parse(atob(token.split('.')[1]));

        // 检查过期时间 (exp 是秒级时间戳)
        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp > currentTime;
    } catch (e) {
        return false;
    }
}