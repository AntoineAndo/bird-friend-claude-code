export type BlueTitStyle = 'small' | 'classic'
export type Pose = 'idle' | 'listening' | 'thinking' | 'writing' | 'interrupted' | 'sleeping' | 'running' | 'asking'
export type ChickLayer = 'hatching' | 'standing'

declare module 'claude-code' {
  interface PluginState {
    'blue-tit': {
      isShown: Shaped<boolean>
      style: Shaped<'small' | 'classic'>
      isBlinking: boolean
      isChickBlinking: boolean
      pose: Pose
      step: number
      chick: ChickLayer | 'none'
      chickStep: number
    }
  }
}
