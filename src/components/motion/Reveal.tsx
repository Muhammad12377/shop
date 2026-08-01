"use client"

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react"

export default function Reveal({
  children,
  variant = "up",
  delay = 0,
  stagger = false,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode
  variant?: "up" | "fade" | "scale"
  delay?: number
  stagger?: boolean
  className?: string
  as?: ElementType
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const animClass =
    variant === "fade" ? "reveal reveal-fade" : variant === "scale" ? "reveal reveal-scale" : "reveal"

  return (
    <Tag
      ref={ref}
      className={`${stagger ? "reveal-stagger" : animClass} ${visible ? "reveal-visible" : ""} ${className}`}
      style={{ animationDelay: delay ? `${delay}ms` : undefined }}
    >
      {children}
    </Tag>
  )
}
