import React, { useEffect, useRef } from 'react';

const SnakeDecorativa: React.FC = () => {
  const numSegments = 16;
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Criar os segmentos da cobrinha no DOM
    const segments: HTMLDivElement[] = [];
    const positions = Array.from({ length: numSegments }, () => ({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    }));
    
    for (let i = 0; i < numSegments; i++) {
      const el = document.createElement('div');
      el.style.position = 'fixed';
      
      // Cabeça é um pouco maior, os segmentos seguintes vão afinando
      const size = i === 0 ? 14 : Math.max(4, 12 - (i * 0.5));
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = '50%';
      el.style.pointerEvents = 'none';
      el.style.zIndex = '999999';
      
      // Cabeça com gradiente verde esmeralda forte e olhinhos
      if (i === 0) {
        el.style.background = 'radial-gradient(circle, #059669 0%, #047857 100%)';
        el.style.boxShadow = '0 0 10px rgba(5, 150, 105, 0.6)';
        
        // Olho esquerdo
        const eyeL = document.createElement('div');
        eyeL.style.position = 'absolute';
        eyeL.style.width = '3px';
        eyeL.style.height = '3px';
        eyeL.style.backgroundColor = '#ffffff';
        eyeL.style.borderRadius = '50%';
        eyeL.style.top = '3px';
        eyeL.style.left = '3px';
        
        // Olho direito
        const eyeR = document.createElement('div');
        eyeR.style.position = 'absolute';
        eyeR.style.width = '3px';
        eyeR.style.height = '3px';
        eyeR.style.backgroundColor = '#ffffff';
        eyeR.style.borderRadius = '50%';
        eyeR.style.top = '3px';
        eyeR.style.right = '3px';
        
        el.appendChild(eyeL);
        el.appendChild(eyeR);
      } else {
        // Corpo da cobrinha com gradiente de opacidade
        const ratio = i / numSegments;
        el.style.background = `rgba(16, 185, 129, ${1 - ratio * 0.75})`;
        el.style.boxShadow = `0 0 5px rgba(16, 185, 129, ${0.4 - ratio * 0.3})`;
      }
      
      containerRef.current.appendChild(el);
      segments.push(el);
    }
    
    // Configurações de movimentação
    let angle = Math.random() * Math.PI * 2;
    let speed = 2.5;
    let animationFrameId: number;
    
    const update = () => {
      // 1. Atualizar coordenada da cabeça
      let headX = positions[0].x;
      let headY = positions[0].y;
      
      // Mudar o ângulo suavemente para simular rastejar autônomo
      angle += (Math.random() - 0.5) * 0.22;
      
      headX += Math.cos(angle) * speed;
      headY += Math.sin(angle) * speed;
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      const margin = 15;
      
      // Rebater suavemente ao colidir com as bordas da tela
      if (headX < margin) {
        headX = margin;
        angle = Math.PI - angle + (Math.random() - 0.5) * 0.2;
      } else if (headX > width - margin) {
        headX = width - margin;
        angle = Math.PI - angle + (Math.random() - 0.5) * 0.2;
      }
      
      if (headY < margin) {
        headY = margin;
        angle = -angle + (Math.random() - 0.5) * 0.2;
      } else if (headY > height - margin) {
        headY = height - margin;
        angle = -angle + (Math.random() - 0.5) * 0.2;
      }
      
      positions[0] = { x: headX, y: headY };
      
      // 2. Fazer o corpo seguir a cabeça (cinemática inversa simplificada)
      for (let i = 1; i < numSegments; i++) {
        const prev = positions[i - 1];
        const curr = positions[i];
        
        const dx = prev.x - curr.x;
        const dy = prev.y - curr.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const targetDist = 7; // Distância fixa entre os elos
        
        if (dist > targetDist) {
          const ratio = targetDist / dist;
          curr.x = prev.x - dx * ratio;
          curr.y = prev.y - dy * ratio;
        }
      }
      
      // 3. Atualizar o CSS das divs correspondentes
      segments.forEach((seg, i) => {
        const size = parseFloat(seg.style.width);
        seg.style.left = `${positions[i].x - size / 2}px`;
        seg.style.top = `${positions[i].y - size / 2}px`;
      });
      
      animationFrameId = requestAnimationFrame(update);
    };
    
    animationFrameId = requestAnimationFrame(update);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);
  
  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: 0, 
        height: 0, 
        pointerEvents: 'none', 
        zIndex: 999999 
      }} 
    />
  );
};

export default SnakeDecorativa;
