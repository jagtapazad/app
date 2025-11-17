'use client';
import { useEffect, useRef, useState, createElement, useMemo, useCallback } from 'react';
import { gsap } from 'gsap';

const TypingText = ({
  text,
  as: Component = 'div',
  typingSpeed = 50,
  initialDelay = 0,
  pauseDuration = 2000,
  deletingSpeed = 30,
  loop = true,
  className = '',
  showCursor = true,
  hideCursorWhileTyping = false,
  cursorCharacter = '|',
  cursorClassName = '',
  cursorBlinkDuration = 0.5,
  textColors = [],
  gradientClasses = [],     // ✅ NEW — Gradient per phrase
  variableSpeed,
  onSentenceComplete,
  startOnVisible = false,
  reverseMode = false,
  ...props
}) => {

  // ============================
  // STATE
  // ============================
  const [displayedText, setDisplayedText] = useState('');
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(!startOnVisible);

  const cursorRef = useRef(null);
  const containerRef = useRef(null);

  const textArray = useMemo(() => (Array.isArray(text) ? text : [text]), [text]);

  // ============================
  // HELPERS
  // ============================

  const getRandomSpeed = useCallback(() => {
    if (!variableSpeed) return typingSpeed;
    const { min, max } = variableSpeed;
    return Math.random() * (max - min) + min;
  }, [variableSpeed, typingSpeed]);

  const getCurrentSolidColor = () => {
    if (textColors.length === 0) return 'currentColor';
    return textColors[currentTextIndex % textColors.length];
  };

  // ============================
  // OBSERVE VISIBILITY
  // ============================
  useEffect(() => {
    if (!startOnVisible || !containerRef.current) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setIsVisible(true);
      });
    }, { threshold: 0.1 });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [startOnVisible]);

  // ============================
  // CURSOR BLINK (GSAP)
  // ============================
  useEffect(() => {
    if (showCursor && cursorRef.current) {
      gsap.set(cursorRef.current, { opacity: 1 });
      gsap.to(cursorRef.current, {
        opacity: 0,
        duration: cursorBlinkDuration,
        repeat: -1,
        yoyo: true,
        ease: 'power2.inOut'
      });
    }
  }, [showCursor, cursorBlinkDuration]);

  // ============================
  // MAIN TYPING LOGIC
  // ============================
  useEffect(() => {
    if (!isVisible) return;

    let timeout;
    const currentText = textArray[currentTextIndex];
    const processedText = reverseMode
      ? currentText.split('').reverse().join('')
      : currentText;

    const animateTyping = () => {
      if (isDeleting) {
        // Deleting characters
        if (displayedText === '') {
          setIsDeleting(false);

          if (currentTextIndex === textArray.length - 1 && !loop) return;

          if (onSentenceComplete) {
            onSentenceComplete(textArray[currentTextIndex], currentTextIndex);
          }

          setCurrentTextIndex(prev => (prev + 1) % textArray.length);
          setCurrentCharIndex(0);
          timeout = setTimeout(() => {}, pauseDuration);

        } else {
          timeout = setTimeout(() => {
            setDisplayedText(prev => prev.slice(0, -1));
          }, deletingSpeed);
        }

      } else {
        // Typing characters
        if (currentCharIndex < processedText.length) {
          timeout = setTimeout(() => {
            setDisplayedText(prev => prev + processedText[currentCharIndex]);
            setCurrentCharIndex(prev => prev + 1);
          }, variableSpeed ? getRandomSpeed() : typingSpeed);

        } else if (textArray.length > 1) {
          timeout = setTimeout(() => {
            setIsDeleting(true);
          }, pauseDuration);
        }
      }
    };

    if (currentCharIndex === 0 && !isDeleting && displayedText === '') {
      timeout = setTimeout(animateTyping, initialDelay);
    } else {
      animateTyping();
    }

    return () => clearTimeout(timeout);
  }, [
    currentCharIndex,
    displayedText,
    isDeleting,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    textArray,
    currentTextIndex,
    loop,
    initialDelay,
    isVisible,
    reverseMode,
    variableSpeed,
    onSentenceComplete,
    getRandomSpeed
  ]);

  // Cursor hiding logic
  const shouldHideCursor =
    hideCursorWhileTyping &&
    (currentCharIndex < textArray[currentTextIndex].length || isDeleting);

  // ============================
  // RENDER
  // ============================
  return createElement(
    Component,
    {
      ref: containerRef,
      className: `inline-block whitespace-pre-wrap tracking-tight ${className}`,
      ...props
    },

    // THE GRADIENT TEXT SPAN
    <span
      className={`
        inline
        ${gradientClasses.length > 0
          ? gradientClasses[currentTextIndex % gradientClasses.length]
          : ''}
        bg-clip-text text-transparent
      `}
      style={gradientClasses.length === 0 ? { color: getCurrentSolidColor() } : {}}
    >
      {displayedText}
    </span>,

    // CURSOR
    showCursor && (
      <span
        ref={cursorRef}
        className={`inline-block opacity-100 ${
          shouldHideCursor ? 'hidden' : ''
        } ${
          cursorCharacter === '|'
            ? `h-5 w-[1px] translate-y-1 bg-foreground ${cursorClassName}`
            : `ml-1 ${cursorClassName}`
        }`}
      >
        {cursorCharacter === '|' ? '' : cursorCharacter}
      </span>
    )
  );
};

export default TypingText;
