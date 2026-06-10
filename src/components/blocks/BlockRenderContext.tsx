import { createContext, useContext, type ReactNode } from 'react'

export type BlockRenderVariant = 'default' | 'gallery'

const BlockRenderContext = createContext<BlockRenderVariant>('default')

export function BlockRenderProvider({
  variant = 'default',
  children,
}: {
  variant?: BlockRenderVariant
  children: ReactNode
}) {
  return (
    <BlockRenderContext.Provider value={variant}>
      {children}
    </BlockRenderContext.Provider>
  )
}

export function useBlockRenderVariant(): BlockRenderVariant {
  return useContext(BlockRenderContext)
}
