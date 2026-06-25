import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, User, ArrowRight, Sparkles, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'

export default function RegisterPage() {
  const navigate = useNavigate()
  const register = useAuthStore((state) => state.register)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name) {
      newErrors.name = '请输入昵称'
    } else if (formData.name.length < 2) {
      newErrors.name = '昵称至少2个字符'
    }
    
    if (!formData.email) {
      newErrors.email = '请输入邮箱'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址'
    }
    
    if (!formData.password) {
      newErrors.password = '请输入密码'
    } else if (formData.password.length < 6) {
      newErrors.password = '密码长度至少为6位'
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '请确认密码'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    try {
      await register(formData.email, formData.password, formData.name)
      navigate('/')
    } catch (error) {
      setErrors({ submit: '注册失败，请重试' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center p-4 overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, -180, -360],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-400/20 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [360, 180, 0],
          }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-orange-400/20 to-transparent rounded-full blur-3xl"
        />
      </div>

      {/* 注册卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="p-8 backdrop-blur-lg bg-white/90 dark:bg-gray-800/90 shadow-2xl">
          {/* Logo 和标题 */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl mb-4 shadow-lg"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">创建账号</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">加入 LinguaHub 开始学习</p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 昵称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                昵称
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="你的昵称"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all duration-200 outline-none
                    ${errors.name 
                      ? 'border-red-400 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:border-emerald-500'
                    }
                    text-gray-900 dark:text-white placeholder-gray-400`}
                />
              </div>
              {errors.name && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm mt-1"
                >
                  {errors.name}
                </motion.p>
              )}
            </div>

            {/* 邮箱 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                邮箱地址
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all duration-200 outline-none
                    ${errors.email 
                      ? 'border-red-400 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:border-emerald-500'
                    }
                    text-gray-900 dark:text-white placeholder-gray-400`}
                />
              </div>
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm mt-1"
                >
                  {errors.email}
                </motion.p>
              )}
            </div>

            {/* 密码 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all duration-200 outline-none
                    ${errors.password 
                      ? 'border-red-400 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:border-emerald-500'
                    }
                    text-gray-900 dark:text-white placeholder-gray-400`}
                />
              </div>
              {errors.password && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm mt-1"
                >
                  {errors.password}
                </motion.p>
              )}
            </div>

            {/* 确认密码 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                确认密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all duration-200 outline-none
                    ${errors.confirmPassword 
                      ? 'border-red-400 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:border-emerald-500'
                    }
                    text-gray-900 dark:text-white placeholder-gray-400`}
                />
                {formData.confirmPassword && !errors.confirmPassword && formData.password === formData.confirmPassword && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              {errors.confirmPassword && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm mt-1"
                >
                  {errors.confirmPassword}
                </motion.p>
              )}
            </div>

            {/* 提交错误 */}
            {errors.submit && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-sm text-center"
              >
                {errors.submit}
              </motion.p>
            )}

            {/* 注册按钮 */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  注册中...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  注册
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
          </form>

          {/* 登录链接 */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              已有账号？{' '}
              <Link
                to="/login"
                className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
              >
                立即登录
              </Link>
            </p>
          </div>
        </Card>

        {/* 装饰性浮动元素 */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-4 -left-4 w-6 h-6 bg-teal-400 rounded-full opacity-60"
        />
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="absolute -bottom-2 -right-4 w-8 h-8 bg-amber-400 rounded-full opacity-60"
        />
      </motion.div>
    </div>
  )
}
