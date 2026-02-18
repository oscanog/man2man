import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

interface UseBottomSheetDragOptions {
  collapsedOffset: number
  defaultExpanded?: boolean
  closeThreshold?: number
  closeVelocity?: number
  openVelocity?: number
  onExpandedChange?: (expanded: boolean) => void
}

interface DragState {
  pointerId: number
  startY: number
  startTranslateY: number
  startedAt: number
  moved: boolean
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function useBottomSheetDrag({
  collapsedOffset,
  defaultExpanded = true,
  closeThreshold = 0.5,
  closeVelocity = 0.45,
  openVelocity = 0.45,
  onExpandedChange,
}: UseBottomSheetDragOptions) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isDragging, setIsDragging] = useState(false)
  const [translateY, setTranslateY] = useState(defaultExpanded ? 0 : Math.max(0, collapsedOffset))
  const [justDragged, setJustDragged] = useState(false)

  const dragStateRef = useRef<DragState | null>(null)
  const translateYRef = useRef(translateY)
  const resetDragTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  useEffect(() => {
    translateYRef.current = translateY
  }, [translateY])

  useEffect(() => {
    if (resetDragTimerRef.current !== null) {
      window.clearTimeout(resetDragTimerRef.current)
      resetDragTimerRef.current = null
    }
    return () => {
      if (resetDragTimerRef.current !== null) {
        window.clearTimeout(resetDragTimerRef.current)
      }
    }
  }, [])

  const snapTo = useCallback(
    (expanded: boolean) => {
      const safeExpanded = collapsedOffset <= 0 ? true : expanded
      setIsExpanded(safeExpanded)
      setTranslateY(safeExpanded ? 0 : collapsedOffset)
      onExpandedChange?.(safeExpanded)
    },
    [collapsedOffset, onExpandedChange],
  )

  const toggleExpanded = useCallback(() => {
    snapTo(!isExpanded)
  }, [isExpanded, snapTo])

  useEffect(() => {
    if (isDragging) return
    if (collapsedOffset <= 0) {
      if (!isExpanded) {
        setIsExpanded(true)
        onExpandedChange?.(true)
      }
      setTranslateY(0)
      return
    }
    setTranslateY(isExpanded ? 0 : collapsedOffset)
  }, [collapsedOffset, isDragging, isExpanded, onExpandedChange])

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (collapsedOffset <= 0) return
      if (event.pointerType === 'mouse' && event.button !== 0) return

      event.currentTarget.setPointerCapture(event.pointerId)
      dragStateRef.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startTranslateY: translateYRef.current,
        startedAt: performance.now(),
        moved: false,
      }
      setIsDragging(true)
    },
    [collapsedOffset],
  )

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragStateRef.current
      if (!drag || drag.pointerId !== event.pointerId) return

      const deltaY = event.clientY - drag.startY
      if (Math.abs(deltaY) > 3 && !drag.moved) {
        drag.moved = true
      }

      setTranslateY(clamp(drag.startTranslateY + deltaY, 0, Math.max(0, collapsedOffset)))
    },
    [collapsedOffset],
  )

  const finishDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragStateRef.current
      if (!drag || drag.pointerId !== event.pointerId) return

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      const maxOffset = Math.max(0, collapsedOffset)
      const deltaY = event.clientY - drag.startY
      const currentTranslate = clamp(drag.startTranslateY + deltaY, 0, maxOffset)
      const elapsed = Math.max(16, performance.now() - drag.startedAt)
      const velocity = deltaY / elapsed
      const progress = maxOffset === 0 ? 0 : currentTranslate / maxOffset

      if (drag.moved) {
        event.preventDefault()
        setJustDragged(true)
        if (resetDragTimerRef.current !== null) {
          window.clearTimeout(resetDragTimerRef.current)
        }
        resetDragTimerRef.current = window.setTimeout(() => {
          setJustDragged(false)
        }, 140)
      }

      dragStateRef.current = null
      setIsDragging(false)
      setTranslateY(currentTranslate)

      if (maxOffset === 0) {
        snapTo(true)
        return
      }

      const shouldCollapse =
        velocity > closeVelocity ||
        (velocity > -openVelocity && progress > closeThreshold)

      snapTo(!shouldCollapse)
    },
    [closeThreshold, closeVelocity, collapsedOffset, openVelocity, snapTo],
  )

  const handlePointerCancel = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragStateRef.current = null
    setIsDragging(false)
    setTranslateY(isExpanded ? 0 : Math.max(0, collapsedOffset))
  }, [collapsedOffset, isExpanded])

  return {
    isExpanded,
    isDragging,
    justDragged,
    translateY,
    snapTo,
    toggleExpanded,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp: finishDrag,
    handlePointerCancel,
  }
}
