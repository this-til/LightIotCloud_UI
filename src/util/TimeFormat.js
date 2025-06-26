/**
 * 时间格式化工具
 * 提供适合中国人习惯的时间显示格式
 */

/**
 * 格式化日期时间为中国习惯格式
 * @param {Date|string|number} date - 日期对象、日期字符串或时间戳
 * @param {string} format - 格式类型 ('datetime', 'date', 'time', 'short')
 * @returns {string} 格式化后的时间字符串
 */
export function formatDateTime(date, format = 'datetime') {
  const dateObj = date instanceof Date ? date : new Date(date)
  
  if (isNaN(dateObj.getTime())) {
    return '无效时间'
  }

  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  const hour = String(dateObj.getHours()).padStart(2, '0')
  const minute = String(dateObj.getMinutes()).padStart(2, '0')
  const second = String(dateObj.getSeconds()).padStart(2, '0')

  switch (format) {
    case 'datetime':
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`
    case 'date':
      return `${year}-${month}-${day}`
    case 'time':
      return `${hour}:${minute}:${second}`
    case 'short':
      return `${month}-${day} ${hour}:${minute}`
    case 'chart':
      // 图表专用格式，月/日 时:分
      return `${month}/${day} ${hour}:${minute}`
    default:
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`
  }
}

/**
 * 格式化相对时间（多久前）
 * @param {Date|string|number} date - 日期对象、日期字符串或时间戳
 * @returns {string} 相对时间字符串
 */
export function formatRelativeTime(date) {
  const dateObj = date instanceof Date ? date : new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return '刚刚'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`
  } else if (diffHours < 24) {
    return `${diffHours}小时前`
  } else if (diffDays < 30) {
    return `${diffDays}天前`
  } else {
    return formatDateTime(date, 'date')
  }
}

/**
 * 获取中文星期
 * @param {Date|string|number} date - 日期对象、日期字符串或时间戳
 * @returns {string} 中文星期
 */
export function getChineseWeekday(date) {
  const dateObj = date instanceof Date ? date : new Date(date)
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return weekdays[dateObj.getDay()]
}

/**
 * 格式化带星期的完整日期
 * @param {Date|string|number} date - 日期对象、日期字符串或时间戳
 * @returns {string} 带星期的完整日期
 */
export function formatFullDateTime(date) {
  const formatted = formatDateTime(date, 'datetime')
  const weekday = getChineseWeekday(date)
  return `${formatted} ${weekday}`
} 