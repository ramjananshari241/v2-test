'use client';
import React, { useState, useEffect } from 'react';
import Head from 'next/head'; // 🟢 引入 Head 组件控制浏览器标签

// ================= 1. 图标库 =================
const Icons = {
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  Edit: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>,
  Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Settings: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  ArrowUp: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>,
  ArrowDown: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>,
  Top: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 11 12 5 6 11"></polyline><polyline points="18 18 12 12 6 18"></polyline></svg>,
  Bottom: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 6 12 12 18 6"></polyline><polyline points="6 13 12 19 18 13"></polyline></svg>,
  Refresh: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>,
  FolderIcon: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff" style={{opacity:0.8}}><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path></svg>,
  ChevronDown: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>,
  FolderMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  CoverMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
  TextMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
  GridMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  Tutorial: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
};

// ================= 2. 全局样式 =================
const GlobalStyle = () => (
  <style dangerouslySetInnerHTML={{__html: `
    body { background-color: #303030; color: #ffffff; margin: 0; font-family: system-ui, sans-serif; overflow-x: hidden; }
    .card-item { position: relative; background: #424242; border-radius: 12px; margin-bottom: 12px; border: 1px solid transparent; cursor: pointer; transition: 0.3s; overflow: hidden; display: flex !important; flex-direction: row !important; align-items: stretch; }
    .card-item:hover { border-color: greenyellow; transform: translateY(-2px); background: #4d4d4d; box-shadow: 0 0 10px rgba(173, 255, 47, 0.1); }
    .drawer { position: absolute; right: -120px; top: 0; bottom: 0; width: 120px; display: flex; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 10; }
    .card-item:hover .drawer { right: 0; }
    .dr-btn { flex: 1; display: flex; align-items: center; justify-content: center; color: #fff; transition: 0.2s; }
    .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
    .modal-box { background: #202024; width: 90%; maxWidth: 900px; height: 90vh; border-radius: 24px; border: 1px solid #333; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    .modal-body { flex: 1; overflow-y: auto; padding: 40px; scroll-behavior: smooth; }
    input, select, textarea { width: 100%; padding: 14px; background: #18181c; border: 1px solid #333; border-radius: 10px; color: #fff; box-sizing: border-box; font-size: 15px; outline: none; transition: 0.3s; }
    .glow-input:focus, .glow-input:hover { border-color: greenyellow; box-shadow: 0 0 12px rgba(173, 255, 47, 0.3); background: #1f1f23; }
    .tag-chip { background: #333; padding: 4px 10px; border-radius: 4px; font-size: 11px; color: #bbb; margin: 0 5px 5px 0; cursor: pointer; position: relative; }
    .tag-del { position: absolute; top: -5px; right: -5px; background: #ff4d4f; color: white; border-radius: 50%; width: 14px; height: 14px; display: none; align-items: center; justify-content: center; font-size: 10px; }
    .tag-chip:hover .tag-del { display: flex; }
    .loader-overlay { position: fixed; inset: 0; background: rgba(20, 20, 23, 0.95); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); flex-direction: column; }
    .loader-text { margin-top: 20px; font-family: monospace; color: #666; font-size: 12px; letter-spacing: 2px; }
    .loader { display: flex; margin: 0.25em 0; }
    .dash { animation: dashArray 2s ease-in-out infinite, dashOffset 2s linear infinite; }
    @keyframes dashArray { 0% { stroke-dasharray: 0 1 359 0; } 50% { stroke-dasharray: 0 359 1 0; } 100% { stroke-dasharray: 359 1 0 0; } }
    @keyframes dashOffset { 0% { stroke-dashoffset: 365; } 100% { stroke-dashoffset: 5; } }
    .animated-button { position: relative; display: flex; align-items: center; gap: 4px; padding: 12px 36px; border: 2px solid; border-color: transparent; font-size: 14px; background-color: inherit; border-radius: 100px; font-weight: 600; color: greenyellow; box-shadow: 0 0 0 2px greenyellow; cursor: pointer; overflow: hidden; transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1); }
    .animated-button svg { position: absolute; width: 20px; fill: greenyellow; z-index: 9; transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1); }
    .animated-button .arr-1 { right: 16px; }
    .animated-button .arr-2 { left: -25%; }
    .animated-button .circle { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20px; height: 20px; background-color: greenyellow; border-radius: 50%; opacity: 0; transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1); }
    .animated-button .text { position: relative; z-index: 1; transform: translateX(-12px); transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1); }
    .animated-button:hover { box-shadow: 0 0 0 12px transparent; color: #212121; border-radius: 12px; }
    .animated-button:hover .arr-1 { right: -25%; }
    .animated-button:hover .arr-2 { left: 16px; }
    .animated-button:hover .text { transform: translateX(12px); }
    .animated-button:hover svg { fill: #212121; }
    .animated-button:active { scale: 0.95; box-shadow: 0 0 0 4px greenyellow; }
    .animated-button:hover .circle { width: 220px; height: 220px; opacity: 1; }
    .nav-container { position: relative; background: #202024; border-radius: 50px; padding: 5px; display: flex; align-items: center; gap: 5px; border: 1px solid #333; width: fit-content; }
    .nav-glider { position: absolute; top: 5px; bottom: 5px; background: greenyellow; border-radius: 40px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 1; }
    .nav-item { position: relative; z-index: 2; padding: 8px 16px; cursor: pointer; color: #888; transition: color 0.3s; display: flex; align-items: center; justify-content: center; width: 40px; }
    .nav-item.active { color: #000; font-weight: bold; }
    .block-card { background: #2a2a2e; border: 1px solid #333; border-radius: 10px; padding: 15px 15px 15px 55px; margin-bottom: 12px; position: relative; transition: border 0.2s; }
    .block-card:hover { border-color: greenyellow; }
    .block-card.just-moved { animation: moveHighlight 0.6s ease-out; }
    @keyframes moveHighlight { 0% { box-shadow: 0 0 0 0 rgba(173, 255, 47, 0); border-color: #333; } 30% { box-shadow: 0 0 15px 2px rgba(173, 255, 47, 0.4); border-color: greenyellow; background: #2f2f33; } 100% { box-shadow: 0 0 0 0 rgba(173, 255, 47, 0); border-color: #333; background: #2a2a2e; } }
    .block-left-ctrl { position: absolute; left: 0; top: 0; bottom: 0; width: 45px; background: rgba(0,0,0,0.2); border-right: 1px solid #333; border-radius: 10px 0 0 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
    .move-btn { cursor: pointer; color: #888; width: 30px; height: 30px; border-radius: 6px; transition: 0.2s; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); }
    .move-btn:hover { background: greenyellow; color: #000; box-shadow: 0 0 10px greenyellow; }
    .move-btn:active { transform: scale(0.9); }
    .block-label { font-size: 12px; color: greenyellow; margin-bottom: 8px; fontWeight: bold; text-transform: uppercase; letter-spacing: 1px; }
    .block-del { position: absolute; right: 0; top: 0; bottom: 0; width: 40px; background: #ff4d4f; border-radius: 0 10px 10px 0; display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.2s; cursor: pointer; color: white; }
    .block-card:hover .block-del { opacity: 1; right: -40px; }
    .block-card:hover { margin-right: 40px; }
    .acc-btn { width: 100%; background: #424242; padding: 15px 20px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border: 1px solid #555; color: #fff; margin-bottom: 10px; transition: 0.2s; }
    .acc-btn:hover { border-color: greenyellow; color: greenyellow; }
    .acc-content { overflow: hidden; transition: max-height 0.3s ease; max-height: 0; padding: 0 10px; }
    .acc-content.open { max-height: 500px; padding-bottom: 20px; }
    .neo-btn { --bg: #000; --hover-bg: #ff90e8; --hover-text: #000; color: #fff; cursor: pointer; border: 1px solid var(--bg); border-radius: 4px; padding: 0.8em 2em; background: var(--bg); transition: 0.2s; display: flex; justify-content: center; align-items: center; font-weight: bold; gap: 8px; }
    .neo-btn:hover { color: var(--hover-text); transform: translate(-0.25rem, -0.25rem); background: var(--hover-bg); box-shadow: 0.25rem 0.25rem var(--bg); border-color: var(--hover-bg); }
    .neo-btn:active { transform: translate(0); box-shadow: none; }
    .group { display: flex; line-height: 28px; align-items: center; position: relative; max-width: 240px; }
    .input { font-family: "Montserrat", sans-serif; width: 100%; height: 45px; padding-left: 2.5rem; box-shadow: 0 0 0 1.5px #2b2c37, 0 0 25px -17px #000; border: 0; border-radius: 12px; background-color: #16171d; outline: none; color: #bdbecb; transition: all 0.25s cubic-bezier(0.19, 1, 0.22, 1); cursor: text; z-index: 0; }
    .input::placeholder { color: #bdbecb; }
    .input:hover { box-shadow: 0 0 0 2.5px #2f303d, 0px 0px 25px -15px #000; }
    .input:active { transform: scale(0.95); }
    .input:focus { box-shadow: 0 0 0 2.5px #2f303d; }
    .search-icon { position: absolute; left: 1rem; fill: #bdbecb; width: 1rem; height: 1rem; pointer-events: none; z-index: 1; }
    .fab-scroll { position: fixed; right: 30px; bottom: 150px; display: flex; flex-direction: column; gap: 10px; z-index: 99; }
    .fab-btn { width: 45px; height: 45px; background: greenyellow; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer; transition: 0.2s; }
    .fab-btn:hover { transform: scale(1.1); box-shadow: 0 6px 16px rgba(173, 255, 47, 0.4); }
    .btn-disabled { opacity: 0.5; cursor: not-allowed; }
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #202024; }
    ::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #555; }
  `}} />
);

// --- 3. 辅助组件 ---
const SearchInput = ({ value, onChange }) => (
  <div className="group">
    <svg className="search-icon" aria-hidden="true" viewBox="0 0 24 24"><g><path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z"></path></g></svg>
    <input placeholder="Search" type="search" className="input" value={value} onChange={onChange} />
  </div>
);

const StepAccordion = ({ step, title, isOpen, onToggle, children }) => (
  <div>
    <div className="acc-btn" onClick={onToggle}>
      <div style={{fontWeight:'bold'}}><span style={{color:'greenyellow', marginRight:'10px'}}>Step {step}</span>{title}</div>
      <div style={{transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition:'0.3s'}}><Icons.ChevronDown /></div>
    </div>
    <div className={`acc-content ${isOpen ? 'open' : ''}`}>{children}</div>
  </div>
);

const AnimatedBtn = ({ text, onClick, style }) => (
  <button className="animated-button" onClick={onClick} style={style}>
    <svg viewBox="0 0 24 24" className="arr-2" xmlns="http://www.w3.org/2000/svg"><path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path></svg>
    <span className="text">{text}</span>
    <span className="circle"></span>
    <svg viewBox="0 0 24 24" className="arr-1" xmlns="http://www.w3.org/2000/svg"><path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path></svg>
  </button>
);

const SlidingNav = ({ activeIdx, onSelect }) => {
  const icons = [Icons.FolderMode, Icons.CoverMode, Icons.TextMode, Icons.GridMode];
  return (
    <div className="nav-container">
      <div className="nav-glider" style={{ left: `${activeIdx * 45 + 5}px`, width: '40px' }} />
      {icons.map((Icon, i) => (<div key={i} className={`nav-item ${activeIdx === i ? 'active' : ''}`} onClick={() => onSelect(i)}><Icon /></div>))}
    </div>
  );
};

const FullScreenLoader = () => (
  <div className="loader-overlay">
    <div className="loader">
      <svg viewBox="0 0 200 60" width="200" height="60">
        <path className="dash" fill="none" stroke="greenyellow" strokeWidth="3" d="M20,50 L20,10 L50,10 C65,10 65,30 50,30 L20,30" />
        <path className="dash" fill="none" stroke="greenyellow" strokeWidth="3" d="M80,50 L80,10 L110,10 C125,10 125,30 110,30 L80,30 M100,30 L120,50" />
        <path className="dash" fill="none" stroke="greenyellow" strokeWidth="3" d="M140,30 A20,20 0 1,0 180,30 A20,20 0 1,0 140,30" />
      </svg>
    </div>
    <div className="loader-text">SYSTEM PROCESSING</div>
  </div>
);

// 工具函数：清洗 URL
// 🟢 修复版：AdminDashboard 顶部的洗链逻辑
const cleanAndFormat = (input) => {
  if (!input) return "";
  const lines = input.split('\n').map(line => {
    let raw = line.trim();
    if (!raw) return ""; 
    
    // 1. 提取 URL
    const mdMatch = raw.match(/\[.*?\]\((.*?)\)/);
    let urlCandidate = mdMatch ? mdMatch[1] : raw;
    const urlMatch = urlCandidate.match(/https?:\/\/[^\s"']+/);
    
    if(urlMatch) {
      let finalUrl = urlMatch[0];
      
      // 2. 强制转义中括号，防止 Notion 报错
      if (/[\[\]]/.test(finalUrl)) {
        try {
          finalUrl = encodeURI(decodeURI(finalUrl));
        } catch(e) {
          finalUrl = encodeURI(finalUrl);
        }
      }
      
      // 3. 包装成标准格式
      if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|mp4|mov|webm|ogg|mkv)(\?|$)/i.test(finalUrl)) {
         return `![](${finalUrl})`;
      }
      return finalUrl;
    }
    return raw;
  });
  return lines.filter(l=>l).join('\n');
};

// ==========================================
// 4. 积木编辑器
// ==========================================
const BlockBuilder = ({ blocks, setBlocks }) => {
  const [movingId, setMovingId] = useState(null);

  const scrollToBlock = (id) => {
    setTimeout(() => {
       const el = document.getElementById(`block-${id}`);
       if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const addBlock = (type) => {
    const newId = Date.now() + Math.random();
    setBlocks([...blocks, { id: newId, type, content: '', pwd: '' }]);
    scrollToBlock(newId);
  };
  const updateBlock = (id, val, key='content') => { setBlocks(blocks.map(b => b.id === id ? { ...b, [key]: val } : b)); };
  const removeBlock = (id) => { setBlocks(blocks.filter(b => b.id !== id)); };

  const moveBlock = (index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === blocks.length - 1) return;
    const newBlocks = [...blocks];
    const targetIndex = index + direction;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setBlocks(newBlocks);
    setMovingId(newBlocks[targetIndex].id);
    setTimeout(() => setMovingId(null), 600);
    scrollToBlock(newBlocks[targetIndex].id);
  };

  const moveToTop = (index) => {
    if (index === 0) return;
    const newBlocks = [...blocks];
    const [item] = newBlocks.splice(index, 1);
    newBlocks.unshift(item);
    setBlocks(newBlocks);
    setMovingId(item.id);
    setTimeout(() => setMovingId(null), 600);
    scrollToBlock(item.id);
  };

  const moveToBottom = (index) => {
    if (index === blocks.length - 1) return;
    const newBlocks = [...blocks];
    const [item] = newBlocks.splice(index, 1);
    newBlocks.push(item);
    setBlocks(newBlocks);
    setMovingId(item.id);
    setTimeout(() => setMovingId(null), 600);
    scrollToBlock(item.id);
  };

  const getBlockLabel = (type) => {
      if (type === 'h1') return 'H1 标题';
      if (type === 'lock') return '🔒 加密块';
      if (type === 'note') return '💬 注释块';
      return '📄 内容块';
  };
  return (
    <div style={{marginTop:'30px'}}>
      <div style={{display:'flex', gap:'15px', marginBottom:'25px', justifyContent:'center', flexWrap:'wrap'}}>
          <div className="neo-btn" onClick={()=>addBlock('h1')}>H1 标题</div>
          <div className="neo-btn" onClick={()=>addBlock('text')}>📝 内容块</div>
          <div className="neo-btn" onClick={()=>addBlock('note')}>💬 注释块</div>
          <div className="neo-btn" onClick={()=>addBlock('lock')}>🔒 加密块</div>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
        {blocks.map((b, index) => (
          <div key={b.id} id={`block-${b.id}`} className={`block-card ${movingId === b.id ? 'just-moved' : ''}`}>
            <div className="block-left-ctrl">
               <div className="move-btn" onClick={() => moveToTop(index)} title="置顶"><Icons.Top /></div>
               <div className="move-btn" onClick={() => moveBlock(index, -1)}><Icons.ArrowUp /></div>
               <div className="move-btn" onClick={() => moveBlock(index, 1)}><Icons.ArrowDown /></div>
               <div className="move-btn" onClick={() => moveToBottom(index)} title="置底"><Icons.Bottom /></div>
            </div>
            <div className="block-label">{getBlockLabel(b.type)}</div>
            {b.type === 'h1' && <input className="glow-input" placeholder="输入大标题..." value={b.content} onChange={e=>updateBlock(b.id, e.target.value)} style={{fontSize:'20px', fontWeight:'bold'}} />}
            {b.type === 'text' && <textarea className="glow-input" placeholder="输入正文，直接粘贴多行链接..." value={b.content} onChange={e=>updateBlock(b.id, e.target.value)} style={{minHeight:'200px'}} />}
            {b.type === 'note' && <textarea className="glow-input" placeholder="输入注释内容..." value={b.content} onChange={e=>updateBlock(b.id, e.target.value)} style={{minHeight:'80px', color: '#ff6b6b', fontFamily: 'monospace', fontSize: '13px'}} />}
            {b.type === 'lock' && (
               <div style={{background:'#202024', padding:'10px', borderRadius:'8px'}}>
                 <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px'}}><span>🔑</span><input className="glow-input" placeholder="留空则无密码" value={b.pwd} onChange={e=>updateBlock(b.id, e.target.value, 'pwd')} style={{width:'150px'}} /></div>
                 <textarea className="glow-input" placeholder="输入被加密内容..." value={b.content} onChange={e=>updateBlock(b.id, e.target.value)} style={{minHeight:'200px', border:'1px dashed #555'}} />
               </div>
            )}
            <div className="block-del" onClick={()=>removeBlock(b.id)}><Icons.Trash /></div>
          </div>
        ))}
        {blocks.length === 0 && <div style={{textAlign:'center', color:'#666', padding:'40px', border:'2px dashed #444', borderRadius:'12px'}}>👋 暂无内容，请点击上方按钮添加模块</div>}
      </div>
    </div>
  );
};

const NotionView = ({ blocks }) => {
  if (!blocks || !Array.isArray(blocks)) return <div style={{padding:20, color:'#666'}}>暂无预览内容</div>;
  return (
    <div style={{color:'#e1e1e3', fontSize:'15px', lineHeight:'1.8'}}>
      {blocks.map((b, i) => {
        const type = b.type; const data = b[type]; const text = data?.rich_text?.[0]?.plain_text || "";
        if(type==='heading_1') return <h1 key={i} style={{fontSize:'1.8em', borderBottom:'1px solid #333', paddingBottom:'8px', margin:'24px 0 12px'}}>{text}</h1>;
        if(type==='paragraph') {
            const richText = data?.rich_text?.[0];
            if (richText?.annotations?.code) return <div key={i} style={{margin:'10px 0', borderLeft:'3px solid #ff6b6b', paddingLeft:'10px'}}><span style={{color:'#ff6b6b', fontFamily:'monospace', fontSize:'0.95em'}}>{text}</span></div>;
            return <p key={i} style={{margin:'10px 0', minHeight:'1em'}}>{text}</p>;
        }
        if(type==='divider') return <hr key={i} style={{border:'none', borderTop:'1px solid #444', margin:'24px 0'}} />;
        if(type==='image') { const url = data?.file?.url || data?.external?.url; if (!url) return null; const isVideo = url.match(/\.(mp4|mov|webm|ogg)(\?|$)/i); if(isVideo) return <div key={i} style={{display:'flex', justifyContent:'center', margin:'20px 0'}}><div style={{width:'100%', maxHeight:'500px', borderRadius:'8px', background:'#000', display:'flex', justifyContent:'center'}}><video src={url} controls preload="metadata" style={{maxWidth:'100%', maxHeight:'100%'}} /></div></div>; return <div key={i} style={{display:'flex', justifyContent:'center', margin:'20px 0'}}><div style={{width: '100%', height: '500px', background: '#000', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}><img src={url} style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'}} alt="" /></div></div>; }
        if(type==='video' || type==='embed') { let url = data?.file?.url || data?.external?.url || data?.url; if(!url) return null; const isY = url.includes('youtube')||url.includes('youtu.be'); if(isY){if(url.includes('watch?v='))url=url.replace('watch?v=','embed/');if(url.includes('youtu.be/'))url=url.replace('youtu.be/','www.youtube.com/embed/');} return <div key={i} style={{display:'flex', justifyContent:'center', margin:'20px 0'}}>{(type==='embed'||isY)?<iframe src={url} style={{width:'100%',maxWidth:'800px',height:'450px',border:'none',borderRadius:'8px',background:'#000'}} allowFullScreen />:<video src={url} controls style={{width:'100%',maxHeight:'500px',borderRadius:'8px',background:'#000'}}/>}</div>; }
        if(type==='callout') return <div key={i} style={{background:'#2d2d30', padding:'20px', borderRadius:'12px', border:'1px solid #3e3e42', display:'flex', gap:'15px', margin:'20px 0'}}><div style={{fontSize:'1.4em'}}>{b.callout.icon?.emoji || '🔒'}</div><div style={{flex:1}}><div style={{fontWeight:'bold', color:'greenyellow', marginBottom:'4px'}}>{text}</div><div style={{fontSize:'12px', opacity:0.5}}>[ 加密内容已受保护 ]</div></div></div>;
        return null;
      })}
    </div>
  );
};

// ==========================================
// 5. 主组件
// ==========================================
export default function AdminDashboard() {
  // 🟢 最终修复版的主题切换逻辑
  const themeConfig = posts.find(p => p.slug === 'theme-config');
  // 如果 Notion 里没写，或者还没部署出来，默认显示 v1
  const currentActiveTheme = themeConfig?.excerpt?.trim() || 'v1';

  const [isThemeLoading, setIsThemeLoading] = useState(false);

  const handleThemeChange = async (version) => {
    // 如果点击的是当前已经选中的主题，直接返回，避免浪费请求
    if (version === currentActiveTheme) return;

    const configItem = themeConfig;
    if (!configItem) {
      alert("同步失败：未在列表中找到 slug 为 theme-config 的页面。");
      return;
    }

    setIsThemeLoading(true);
    try {
      const payload = {
        id: configItem.id,
        title: configItem.title || '主题配置',
        slug: 'theme-config',
        excerpt: version, // 更新为 v1 或 v2
        titleKey: 'title'
      };

      const res = await fetch('/api/admin/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // 🟢 2. 切换成功后立即刷新列表，按钮状态会随之自动改变
        fetchPosts(); 
        alert(`✅ 模式已切换为 ${version === 'v1' ? '经典' : '极客'}，数据已同步。`);
      }
    } catch (err) {
      alert("同步失败：" + err.message);
    } finally {
      setIsThemeLoading(false);
    }
  };
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [viewMode, setViewMode] = useState('covered');
  const [posts, setPosts] = useState([]);
  const [options, setOptions] = useState({ categories: [], tags: [] });
  const [activeTab, setActiveTab] = useState('Post');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  
  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: 'Post', date: '' }), [currentId, setCurrentId] = useState(null);
  const [siteTitle, setSiteTitle] = useState('PROBLOG');
  const [navIdx, setNavIdx] = useState(1); 
  const [expandedStep, setExpandedStep] = useState(1);
  const [editorBlocks, setEditorBlocks] = useState([]);
  
  const [isDeploying, setIsDeploying] = useState(false);
  

  useEffect(() => { setMounted(true); 
    // 🟢 注入 Logo
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = '/favicon.ico';
    document.head.appendChild(link);
  }, []);
  const isFormValid = form.title.trim() !== '' && form.category.trim() !== '' && form.date !== '';

  async function fetchPosts() {
    setLoading(true); 
    try { 
       const r = await fetch('/api/admin/posts');
       if (!r.ok) throw new Error(`API Error: ${r.status}`);
       const d = await r.json(); 
       if (d.success) { setPosts(d.posts || []); setOptions(d.options || { categories: [], tags: [] }); }
       
       const rConf = await fetch('/api/admin/config');
       if (rConf.ok) {
           const dConf = await rConf.json(); 
           if (dConf.success && dConf.siteInfo) setSiteTitle(dConf.siteInfo.title);
       }
    } catch(e) { console.warn(e); } 
    finally { setLoading(false); } 
  }
  useEffect(() => { if (mounted) fetchPosts(); }, [mounted]);

  useEffect(() => {
    if (view === 'edit') {
      window.history.pushState({ view: 'edit' }, '', '?mode=edit');
    } else {
      if (window.location.search.includes('mode=edit')) window.history.back();
    }
    const onPopState = () => { if (view === 'edit') setView('list'); };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [view]);

  // 双模状态机解析
  const parseContentToBlocks = (md) => {
    if(!md) return [];
    const lines = md.split(/\r?\n/);
    const res = [];
    let buffer = []; let isLocking = false; let lockPwd = ''; let lockBuffer = [];  
    let lockMode = null;

    const stripMd = (str) => { const match = str.match(/(?:!|)?\[.*?\]\((.*?)\)/); return match ? match[1] : str; };
    const flushBuffer = () => {
      if (buffer.length > 0) {
        const joined = buffer.map(stripMd).join('\n').trim();
        if (joined) {
           if (joined.startsWith('`') && joined.endsWith('`') && joined.length > 1) {
              res.push({ id: Date.now() + Math.random(), type: 'note', content: joined.slice(1, -1) });
           } else {
              res.push({ id: Date.now() + Math.random(), type: 'text', content: joined });
           }
        }
        buffer = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!isLocking && trimmed.startsWith(':::lock')) {
        flushBuffer(); isLocking = true; lockMode = 'explicit';
        lockPwd = trimmed.replace(':::lock', '').replace(/[>*\s🔒]/g, '').trim();
        continue;
      }

      if (!isLocking && trimmed.match(/^>\s*🔒\s*(\*\*)?LOCK:(.*?)(\*\*)?/)) {
        flushBuffer(); isLocking = true; lockMode = 'implicit';
        const match = trimmed.match(/LOCK:(.*?)(\*|$)/);
        lockPwd = match ? match[1].trim() : '';
        continue;
      }
      
      if (isLocking) {
        if (lockMode === 'explicit' && trimmed === ':::') {
           isLocking = false;
           const joinedLock = lockBuffer.map(stripMd).join('\n').trim();
           res.push({ id: Date.now() + Math.random(), type: 'lock', pwd: lockPwd, content: joinedLock });
           lockBuffer = [];
           continue;
        }
        if (lockMode === 'implicit' && !trimmed.startsWith('>') && trimmed !== '') {
           isLocking = false;
           const joinedLock = lockBuffer.join('\n').trim();
           res.push({ id: Date.now() + Math.random(), type: 'lock', pwd: lockPwd, content: joinedLock });
           lockBuffer = [];
           i--;
           continue;
        }

        let contentLine = line;
        if (lockMode === 'implicit') {
            if (contentLine.startsWith('> ')) contentLine = contentLine.substring(2);
            else if (contentLine.startsWith('>')) contentLine = contentLine.substring(1);
        }
        if (contentLine.trim() === '---') continue;
        if (contentLine.trim() === '') continue;
        lockBuffer.push(contentLine);
        continue;
      }

      if (trimmed.startsWith('# ')) { flushBuffer(); res.push({ id: Date.now() + Math.random(), type: 'h1', content: trimmed.replace('# ', '') }); continue; }
      if (!trimmed) { flushBuffer(); continue; }
      buffer.push(line);
    }
    
    if (isLocking) {
        const joinedLock = lockMode === 'implicit' ? lockBuffer.join('\n').trim() : lockBuffer.map(stripMd).join('\n').trim();
        res.push({ id: Date.now() + Math.random(), type: 'lock', pwd: lockPwd, content: joinedLock });
    } else {
        flushBuffer();
    }
    return res;
  };

  const handlePreview = (p) => { setLoading(true); fetch('/api/admin/post?id='+p.id).then(r=>r.json()).then(d=>{ if(d.success && d.post && d.post.rawBlocks) setPreviewData(d.post); }).finally(()=>setLoading(false)); };
  const handleEdit = (p) => { setLoading(true); fetch('/api/admin/post?id='+p.id).then(r=>r.json()).then(d=>{ if (d.success) { setForm(d.post); setEditorBlocks(parseContentToBlocks(d.post.content)); setCurrentId(p.id); setView('edit'); setExpandedStep(1); } }).finally(()=>setLoading(false)); };
  
  // 🟢 修复：新建时默认 Published
  const handleCreate = () => { setForm({ title: '', slug: 'p-'+Date.now().toString(36), excerpt:'', content:'', category:'', tags:'', cover:'', status:'Published', type: 'Post', date: new Date().toISOString().split('T')[0] }); setEditorBlocks([]); setCurrentId(null); setView('edit'); setExpandedStep(1); };
  
  const handleSave = async () => {
    if (isDeploying) return alert("请等待更新完成...");
    setLoading(true);
    const fullContent = editorBlocks.map(b => {
      if (b.type === 'h1') return `# ${b.content}`;
      if (b.type === 'note') return `\`${b.content}\``;
      if (b.type === 'lock') return `:::lock ${b.pwd}\n${b.content}\n:::`;
      return b.content;
    }).join('\n\n');

    try {
      const res = await fetch('/api/admin/post', {
        method: 'POST',
        body: JSON.stringify({ 
          ...form, 
          // 🟢 修复：强制提交 Published 状态
          status: 'Published', 
          content: fullContent, 
          id: currentId,
          type: form.type || 'Post' 
        })
      });
      const d = await res.json();
      
      if (!d.success) {
        alert(`❌ 保存失败！\n\n错误信息:\n${d.error}`);
      } else {
        alert("✅ 保存成功！");
        setView('list');
        fetchPosts();
      }
    } catch (e) {
      alert('网络错误: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSiteTitle = async () => {
    const newTitle = prompt("请输入新的网站标题:", siteTitle);
    if (newTitle && newTitle !== siteTitle) {
        setLoading(true); await fetch('/api/admin/config', { method: 'POST', body: JSON.stringify({ title: newTitle }) });
        setSiteTitle(newTitle); setLoading(false);
    }
  };

  const handleManualDeploy = async () => {
     if (isDeploying) return;
     if(confirm('确定要立即更新Blog吗？\n点击确定将立刻开始更新，在完成内容更新前请不要重复提交更新请求！')) {
        setIsDeploying(true);
        try { await fetch('/api/admin/deploy'); } catch(e) {}
        alert('已触发更新！请耐心等待（预计30分钟内完成）。请不要重复提交更新请求。');
        setTimeout(() => setIsDeploying(false), 60000);
     }
  };

  const deleteTagOption = (e, tagToDelete) => {
    e.stopPropagation();
    const currentTags = form.tags ? form.tags.split(',').filter(t => t.trim()) : [];
    const newTags = currentTags.filter(t => t.trim() !== tagToDelete).join(',');
    setForm({ ...form, tags: newTags });
  };

  const handleNavClick = (idx) => { setNavIdx(idx); const modes = ['folder','covered','text','gallery']; setViewMode(modes[idx]); setSelectedFolder(null); };

  const getFilteredPosts = () => {
     let list = posts;
     // 🟢 修复：过滤逻辑 (Page 优先)
     if (activeTab === 'Page') {
        list = list.filter(p => p.type === 'Page' && ['about', 'download'].includes(p.slug));
     } 
     else if (activeTab === 'Widget') {
        list = list.filter(p => p.type === 'Widget');
     }
     else {
        // 默认显示 Post (不含 Draft)
        list = list.filter(p => p.type === 'Post' && p.status !== 'Draft');
        const sticky = list.find(p => p.slug === 'announcement');
        const others = list.filter(p => p.slug !== 'announcement');
        if (sticky) list = [sticky, ...others];
        else list = others;
     }

     if (searchQuery) list = list.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
     if (selectedFolder) list = list.filter(p => p.category === selectedFolder);
     return list;
  };
  const filtered = getFilteredPosts();
  const displayTags = (options.tags && options.tags.length > 0) ? (showAllTags ? options.tags : options.tags.slice(0, 12)) : [];

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#303030', padding: '40px 20px' }}>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <GlobalStyle />
      {loading && <FullScreenLoader />}
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
           <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
             {view === 'list' && <SearchInput value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />}
             <div style={{display:'flex', flexDirection:'column', justifyContent:'center'}}>
                <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '1px', display:'flex', alignItems:'center', gap:'10px' }}>
                   {siteTitle} <span onClick={updateSiteTitle} style={{cursor:'pointer', opacity:0.5}} title="修改网站标题"><Icons.Settings /></span>
                </div>
             </div>
           </div>
           
           <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
             {/* 🟢 修复：更新按钮 */}
             <button onClick={handleManualDeploy} style={{background:'#424242', border: isDeploying ? '1px solid #555' : '1px solid greenyellow', opacity: isDeploying ? 0.5 : 1, padding:'10px', borderRadius:'8px', color: isDeploying ? '#888' : 'greenyellow', cursor: isDeploying ? 'not-allowed' : 'pointer'}} title="立即更新博客前端">
               <Icons.Refresh />
             </button>

             {/* 新增：登陆按钮 */}
              <button 
                onClick={() => window.open('https://van.pro-plus.top/dashboard', '_blank')} 
                style={{
                  background: '#3b82f6', // 使用蓝色，保持低调且专业
                  border: 'none', 
                  padding: '10px 20px', 
                  borderRadius: '8px', 
                  color: '#fff', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '5px', 
                  fontWeight: 'bold', 
                  fontSize: '14px'
                }} 
                className="btn-ia"
              >
                <span style={{fontSize: '16px'}}>🌱</span> 寄售
              </button>

                           {/* 新增：网盘按钮 */}
              <button 
                onClick={() => window.open('https://x1file.top', '_blank')} 
                style={{
                  background: '#271f5c', //
                  border: 'none', 
                  padding: '10px 20px', 
                  borderRadius: '8px', 
                  color: '#fff', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '5px', 
                  fontWeight: 'bold', 
                  fontSize: '14px'
                }} 
                className="btn-ia"
              >
                <span style={{fontSize: '16px'}}>☁️</span>
              </button>

             <button onClick={() => window.open('https://k00.fr/blogcreator', '_blank')} style={{background:'#a855f7', border:'none', padding:'10px 20px', borderRadius:'8px', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px', fontWeight:'bold', fontSize:'14px'}} className="btn-ia"><Icons.Tutorial /> 教程</button>
             {view === 'list' ? <AnimatedBtn text="发布新内容" onClick={handleCreate} /> : <AnimatedBtn text="返回列表" onClick={() => setView('list')} />}
           </div>
        </header>

{view === 'list' ? (
          <main>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {/* 1. 分类标签组 */}
                <div style={{ background: '#424242', padding: '5px', borderRadius: '12px', display: 'flex' }}>
                  {['Post', 'Widget', 'Page'].map(t => (
                    <button
                      key={t}
                      onClick={() => { setActiveTab(t); setSelectedFolder(null); }}
                      style={activeTab === t ? { padding: '8px 20px', border: 'none', background: '#555', color: '#fff', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' } : { padding: '8px 20px', border: 'none', background: 'none', color: '#888', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                    >
                      {t === 'Page' ? '自定义页面' : t === 'Post' ? '已发布' : '组件'}
                    </button>
                  ))}
                </div>

                {/* 2. 🟢 模式切换按钮 (V1/V2) */}
                <div style={{ marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid #444' }}>
  
  {/* V1 按钮 */}
  <button 
    disabled={isThemeLoading}
    onClick={() => handleThemeChange('v1')}
    style={{
      padding: '4px 14px',
      fontSize: '11px',
      fontWeight: '900',
      borderRadius: '6px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: isThemeLoading ? 'not-allowed' : 'pointer',
      border: 'none',
      // 🔴 状态切换逻辑
      background: currentActiveTheme === 'v1' ? '#3b82f6' : 'transparent', 
      color: currentActiveTheme === 'v1' ? '#fff' : '#666',
      boxShadow: currentActiveTheme === 'v1' ? 'inset 0 2px 4px rgba(0,0,0,0.3), 0 0 10px rgba(59,130,246,0.4)' : 'none',
      transform: currentActiveTheme === 'v1' ? 'translateY(1px)' : 'none'
    }}
  >
    V1
  </button>

  {/* 中间分割线 */}
  <div style={{ width: '1px', height: '12px', background: '#555', opacity: currentActiveTheme ? 0 : 1 }}></div>

  {/* V2 按钮 */}
  <button 
    disabled={isThemeLoading}
    onClick={() => handleThemeChange('v2')}
    style={{
      padding: '4px 14px',
      fontSize: '11px',
      fontWeight: '900',
      borderRadius: '6px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: isThemeLoading ? 'not-allowed' : 'pointer',
      border: 'none',
      // 🔴 状态切换逻辑
      background: currentActiveTheme === 'v2' ? '#a855f7' : 'transparent',
      color: currentActiveTheme === 'v2' ? '#fff' : '#666',
      boxShadow: currentActiveTheme === 'v2' ? 'inset 0 2px 4px rgba(0,0,0,0.3), 0 0 10px rgba(168,85,247,0.4)' : 'none',
      transform: currentActiveTheme === 'v2' ? 'translateY(1px)' : 'none'
    }}
  >
    V2
  </button>
</div>
              </div>

              {/* 3. 右侧滑动导航 */}
              <SlidingNav activeIdx={navIdx} onSelect={handleNavClick} />
            </div>

            {/* 4. 列表渲染区域 */}
            <div style={viewMode === 'gallery' || viewMode === 'folder' ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' } : {}}>
              {viewMode === 'folder' && options.categories.map(cat => (
                <div key={cat} onClick={() => { setSelectedFolder(cat); handleNavClick(1); }} style={{ padding: '15px', background: '#424242', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #555', cursor: 'pointer' }} className="btn-ia">
                  <Icons.FolderIcon />{cat}
                </div>
              ))}
              {viewMode !== 'folder' && filtered.map(p => {
                const st = (p.status === 'Draft') ? { borderColor: '#f97316', color: '#f97316', label: '📝 草稿' } : { borderColor: 'transparent', color: 'greenyellow', label: '🚀 已发布' };
                return (
                  <div key={p.id} onClick={() => handlePreview(p)} className="card-item" style={{ ...(viewMode === 'text' ? { display: 'flex', alignItems: 'center', padding: '16px 20px' } : viewMode === 'gallery' ? { display: 'flex', flexDirection: 'column', height: 'auto' } : {}), background: '#424242', borderRadius: '12px', marginBottom: '8px', border: `1px solid ${st.borderColor}` }}>
                    {viewMode === 'covered' && <><div style={{ width: '160px', flexShrink: 0, background: '#303030', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.cover ? <img src={p.cover} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: '28px', color: '#444' }}>{activeTab[0]}</div>}</div><div style={{ padding: '20px 35px', flex: 1 }}><div style={{ fontWeight: 'bold', fontSize: '20px', color: '#fff', marginBottom: '8px' }}>{p.title}</div><div style={{ color: '#fff', fontSize: '12px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ border: `1px solid ${st.color}`, color: st.color, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>{st.label}</span>{p.category} · {p.date}</div></div></>}
                    {viewMode === 'text' && <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}><div style={{ flex: 1, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.color }}></span>{p.title}</div><div style={{ color: '#fff', fontSize: '12px', opacity: 0.8 }}>{p.category} · {p.date}</div></div>}
                    {viewMode === 'gallery' && <><div style={{ height: '140px', background: '#303030', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}><div style={{ position: 'absolute', top: '10px', right: '10px', background: st.color, color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>{p.status === 'Draft' ? 'DRAFT' : 'PUB'}</div>{p.cover ? <img src={p.cover} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: '40px', color: '#444' }}>{activeTab[0]}</div>}</div><div style={{ padding: '15px' }}><div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{p.title}</div><div style={{ color: '#fff', fontSize: '12px', opacity: 0.8 }}>{p.category} · {p.date}</div></div></>}
                    <div className="drawer"><div onClick={(e) => { e.stopPropagation(); handleEdit(p); }} style={{ background: 'greenyellow', color: '#000' }} className="dr-btn"><Icons.Edit /></div><div onClick={(e) => { e.stopPropagation(); if (confirm('彻底删除？')) { setLoading(true); fetch('/api/admin/post?id=' + p.id, { method: 'DELETE' }).then(() => fetchPosts()) } }} style={{ background: '#ff4d4f' }} className="dr-btn"><Icons.Trash /></div></div>
                  </div>
                );
              })}
            </div>
          </main>
        ) : (
          /* 这里是之前的表单编辑代码... */
          <div style={{background: '#424242', padding: 30, borderRadius: 20}}>
            <StepAccordion step={1} title="基础信息" isOpen={expandedStep === 1} onToggle={()=>setExpandedStep(expandedStep===1?0:1)}>
               <div style={{marginBottom:'15px'}}><label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'5px'}}>标题 <span style={{color: '#ff4d4f'}}>*</span></label><input className="glow-input" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} placeholder="输入文章标题..." /></div>
               <div><label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'5px'}}>摘要</label><input className="glow-input" value={form.excerpt} onChange={e=>setForm({...form, excerpt:e.target.value})} placeholder="输入文章摘要..." /></div>
            </StepAccordion>
            <StepAccordion step={2} title="分类与时间" isOpen={expandedStep === 2} onToggle={()=>setExpandedStep(expandedStep===2?0:2)}>
               <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                 <div><label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'5px'}}>分类 <span style={{color: '#ff4d4f'}}>*</span></label><input className="glow-input" list="cats" value={form.category} onChange={e=>setForm({...form, category:e.target.value})} placeholder="选择或输入分类" /><datalist id="cats">{options.categories.map(o=><option key={o} value={o}/>)}</datalist></div>
                 <div><label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'5px'}}>发布日期 <span style={{color: '#ff4d4f'}}>*</span></label><input className="glow-input" type="date" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} /></div>
               </div>
            </StepAccordion>
<StepAccordion step={3} title="标签与封面" isOpen={expandedStep === 3} onToggle={()=>setExpandedStep(expandedStep===3?0:3)}>
               <div style={{marginBottom:'15px'}}><label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'5px'}}>标签</label><input className="glow-input" value={form.tags} onChange={e=>setForm({...form, tags:e.target.value})} placeholder="多标签请用英文逗号+空格分隔，如标签1, 标签2..." /><div style={{marginTop:'10px', display:'flex', flexWrap:'wrap'}}>{displayTags.map(t => <span key={t} className="tag-chip" onClick={()=>{const cur=form.tags ? form.tags.split(',') : []; if(!cur.includes(t)) setForm({...form, tags:[...cur,t].join(',')})}}>{t}<div className="tag-del" onClick={(e)=>{deleteTagOption(e, t)}}>×</div></span>)}{options.tags.length > 12 && <span onClick={()=>setShowAllTags(!showAllTags)} style={{fontSize:'12px', color:'greenyellow', cursor:'pointer', fontWeight:'bold', marginLeft:'5px'}}>{showAllTags ? '收起' : `...`}</span>}</div></div>
               <div><label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'5px'}}>封面图 URL (自动清洗)</label><input className="glow-input" value={form.cover} onChange={e=>setForm({...form, cover:e.target.value})} onBlur={e=>{
                 // 🟢 核心修复：1. 获取清洗后的链接；2. 使用非贪婪正则 .*? 精准剥离 Markdown 壳，不再抹除 URL 内部括号
                 const cleaned = cleanAndFormat(e.target.value);
                 const stripped = cleaned.replace(/^!\[.*?\]\((.*?)\)$/, '$1');
                 setForm({...form, cover: stripped});
               }} placeholder="粘贴链接，自动去除多余参数..." /></div>
            </StepAccordion>
            
            {/* 🟢 修复：移除了 Step 4 发布状态选择 */}
            
            <BlockBuilder blocks={editorBlocks} setBlocks={setEditorBlocks} />
            
            <div className="fab-scroll">
              <div className="fab-btn" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}><Icons.ArrowUp /></div>
              <div className="fab-btn" onClick={() => window.scrollTo({top:99999, behavior:'smooth'})}><Icons.ArrowDown /></div>
            </div>

            <button onClick={handleSave} disabled={!isFormValid} style={{width:'100%', padding:'20px', background:isFormValid?'#fff':'#222', color:isFormValid?'#000':'#666', border:'none', borderRadius:'12px', fontWeight:'bold', fontSize:'16px', marginTop:'40px', cursor:isFormValid?'pointer':'not-allowed', transition:'0.3s'}}>{currentId ? '保存修改' : '确认发布'}</button>
          </div>
        )}
        {previewData && <div className="modal-bg" onClick={()=>setPreviewData(null)}><div className="modal-box" onClick={e=>e.stopPropagation()}><div style={{padding:'20px 25px', borderBottom:'1px solid #333', display:'flex', justifyContent:'space-between', alignItems:'center'}}><strong>预览: {previewData.title}</strong><button onClick={()=>setPreviewData(null)} style={{background:'none', border:'none', color:'#666', fontSize:'24px', cursor:'pointer'}}>×</button></div><div className="modal-body"><NotionView blocks={previewData.rawBlocks} /></div></div></div>}
      </div>
    </div>
  );
}
