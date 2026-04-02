'use client';

type LogoImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  location: string; // e.g., app/page.tsx:navbar-img
};

export default function LogoImage({ src, alt, width, height, className, location }: LogoImageProps) {
  const sendLog = (message: string) => {
    // #region agent log
    fetch('/api/debug-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: 'c24916',
        location,
        message,
        data: { src },
        runId: 'pre-fix',
        hypothesisId: location.includes('navbar')
          ? 'H1'
          : location.includes('hero')
          ? 'H2'
          : 'H3',
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  };

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading="eager"
      onLoad={() => sendLog('logo loaded')}
      onError={() => sendLog('logo error')}
    />
  );
}
