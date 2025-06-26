import { getColorPreset } from "@/util/ColorPreset"

/**
 * 在画布上绘制检测框
 * @param ctx Canvas 2D 上下文
 * @param detections 检测结果数组
 * @param displayInfo 显示区域信息
 */
export function drawBoundingBoxes(ctx, detections, displayInfo) {
    // 清除之前的绘制
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    // 绘制每个检测框
    detections.forEach(detection => {
        // 使用 x, y, w, h 字段
        const { x, y, w, h } = detection

        // 将归一化坐标转换为显示坐标
        const pixelX = displayInfo.offsetX + x * displayInfo.displayWidth
        const pixelY = displayInfo.offsetY + y * displayInfo.displayHeight
        const pixelW = w * displayInfo.displayWidth
        const pixelH = h * displayInfo.displayHeight

        const color = getColorPreset(detection.model, detection.item)

        // 设置绘制样式
        ctx.strokeStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
        ctx.lineWidth = 2
        ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.2)`

        // 绘制边界框
        ctx.strokeRect(pixelX, pixelY, pixelW, pixelH)
        ctx.fillRect(pixelX, pixelY, pixelW, pixelH)

        // 绘制标签
        const text = `${detection.item} ${(detection.probability * 100).toFixed(1)}%`
        const textWidth = ctx.measureText(text).width

        // 确定标签位置（避免超出图像区域）
        let labelX = pixelX
        let labelY = pixelY - 15 // 增加垂直偏移量

        // 如果边界框顶部空间不足，将标签放在边界框内部顶部
        if (pixelY < 40) { // 增加空间裕量
            labelY = pixelY + 20 // 下移更多
        }

        // 确保标签不会超出图像区域
        if (labelY < 0) labelY = 0
        if (labelY > ctx.canvas.height - 20) labelY = ctx.canvas.height - 20

        // 绘制标签背景
        ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
        ctx.fillRect(labelX, labelY - 15, textWidth + 10, 20)

        // Calculate luminance of the label background color
        const luminance = 0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2];
        const textColor = luminance > 128 ? 'black' : 'white';

        // Draw label text
        ctx.fillStyle = textColor;
        ctx.font = '14px sans-serif'
        ctx.fillText(text, labelX + 5, labelY)
    })
}
