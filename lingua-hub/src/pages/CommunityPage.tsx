import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { GroupCard } from '@/components/community/GroupCard'
import { PostCard } from '@/components/community/PostCard'
import { mockPosts, Post } from '@/data/mockPosts'
import { Users, MessageSquare, Plus, PenLine } from 'lucide-react'

type Tab = 'groups' | 'posts'

interface Group {
  id: string
  name: string
  memberCount: number
  icon?: string
  description?: string
  language: 'english' | 'japanese' | 'korean'
}

const groups: Group[] = [
  { id: 'g1', name: '英语学习小组', memberCount: 1234, language: 'english', description: '英语爱好者社区' },
  { id: 'g2', name: '日语交流圈', memberCount: 2567, language: 'japanese', description: '日语学习与交流' },
  { id: 'g3', name: '韩语研习社', memberCount: 1890, language: 'korean', description: '韩语学习社区' },
]

const languageNames = {
  english: '英语',
  japanese: '日语',
  korean: '韩语',
}

const languageFlags = {
  english: '🇬🇧',
  japanese: '🇯🇵',
  korean: '🇰🇷',
}

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<Tab>('groups')
  const [posts, setPosts] = useState<Post[]>(mockPosts)

  const handleJoinGroup = (groupId: string) => {
    console.log('加入小组:', groupId)
  }

  const handleLikePost = (postId: string) => {
    console.log('点赞帖子:', postId)
  }

  const handleNewPost = () => {
    console.log('发布新帖子')
  }

  const groupedPosts = posts.reduce((acc, post) => {
    const lang = post.language || 'mixed'
    if (!acc[lang]) acc[lang] = []
    acc[lang].push(post)
    return acc
  }, {} as Record<string, Post[]>)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">社区中心</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">与志同道合的学习者一起进步</p>
        </motion.div>

        {/* Tab 切换 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-1 inline-flex gap-1">
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'groups'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="font-medium">学习小组</span>
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'posts'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="font-medium">话题广场</span>
            </button>
          </Card>
        </motion.div>

        {/* Tab 内容 */}
        <AnimatePresence mode="wait">
          {activeTab === 'groups' ? (
            <motion.div
              key="groups"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* 英语组 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{languageFlags.english}</span>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {languageNames.english}组
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groups
                    .filter((g) => g.language === 'english')
                    .map((group) => (
                      <GroupCard
                        key={group.id}
                        group={group}
                        onJoin={handleJoinGroup}
                      />
                    ))}
                </div>
              </div>

              {/* 日语组 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{languageFlags.japanese}</span>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {languageNames.japanese}组
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groups
                    .filter((g) => g.language === 'japanese')
                    .map((group) => (
                      <GroupCard
                        key={group.id}
                        group={group}
                        onJoin={handleJoinGroup}
                      />
                    ))}
                </div>
              </div>

              {/* 韩语组 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{languageFlags.korean}</span>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {languageNames.korean}组
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groups
                    .filter((g) => g.language === 'korean')
                    .map((group) => (
                      <GroupCard
                        key={group.id}
                        group={group}
                        onJoin={handleJoinGroup}
                      />
                    ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="posts"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* 发布新帖子按钮 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="p-4">
                  <button
                    onClick={handleNewPost}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <PenLine className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-gray-500 dark:text-gray-400">分享你的学习心得...</span>
                  </button>
                </Card>
              </motion.div>

              {/* 英语帖子 */}
              {groupedPosts['english'] && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{languageFlags.english}</span>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {languageNames.english}
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {groupedPosts['english'].map((post) => (
                      <PostCard key={post.id} post={post} onLike={handleLikePost} />
                    ))}
                  </div>
                </div>
              )}

              {/* 日语帖子 */}
              {groupedPosts['japanese'] && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{languageFlags.japanese}</span>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {languageNames.japanese}
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {groupedPosts['japanese'].map((post) => (
                      <PostCard key={post.id} post={post} onLike={handleLikePost} />
                    ))}
                  </div>
                </div>
              )}

              {/* 韩语帖子 */}
              {groupedPosts['korean'] && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{languageFlags.korean}</span>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {languageNames.korean}
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {groupedPosts['korean'].map((post) => (
                      <PostCard key={post.id} post={post} onLike={handleLikePost} />
                    ))}
                  </div>
                </div>
              )}

              {/* 混合语言帖子 */}
              {groupedPosts['mixed'] && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🌐</span>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      综合讨论
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {groupedPosts['mixed'].map((post) => (
                      <PostCard key={post.id} post={post} onLike={handleLikePost} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
