import React, { useCallback, useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import {
  ArrowDown, ArrowUp, Check, Circle, Copy, Download, FileJson, Grid, Hexagon,
  Image as ImageIcon, Layers, LayoutDashboard, Menu, Pencil, Redo2, Shapes, 
  Sparkles, Square, Star, Trash2, Triangle, Type, Undo2, Upload, ZoomIn, 
  ZoomOut, Maximize, AlignLeft, AlignCenter, AlignRight, Bold, Italic, 
  Underline, Scissors, Palette, MoveDiagonal, MoveRight, Wand2, Smile, 
  LayoutTemplate, QrCode, PieChart, SquareDashed, Settings, ImagePlus, BoxSelect,
  ChevronUp, ChevronDown, Sliders, Crop, RefreshCw, CopyPlus, Video, Play, Pause, Volume2,
  VolumeX, FastForward, Split, Layers3, Film, Music, Mic, Gauge, Image as ImgIcon
} from "lucide-react";

const FONTS = ["Arial", "Courier New", "Georgia", "Times New Roman", "Verdana", "Impact", "Comic Sans MS", "Trebuchet MS"];

const TOOLS = [
  { id: "project", label: "Project", icon: LayoutDashboard },
  { id: "timeline", label: "Timeline", icon: Film },
  { id: "text", label: "Text", icon: Type },
  { id: "shapes", label: "Shapes", icon: Shapes },
  { id: "video", label: "Video", icon: Video },
  { id: "audio", label: "Audio", icon: Music },
  { id: "draw", label: "Draw", icon: Pencil },
  { id: "uploads", label: "Media", icon: Upload },
  { id: "style", label: "Style", icon: Palette },
  { id: "filters", label: "Filters", icon: Wand2 },
  { id: "background", label: "Background", icon: ImagePlus },
  { id: "align", label: "Align", icon: AlignCenter },
  { id: "icons", label: "Icons", icon: Smile },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "qrcode", label: "QR Code", icon: QrCode },
  { id: "charts", label: "Charts", icon: PieChart },
  { id: "frames", label: "Frames", icon: SquareDashed },
  { id: "resize", label: "Canvas", icon: Maximize },
  { id: "layers", label: "Layers", icon: Layers },
  { id: "effects", label: "Effects", icon: Sparkles },
];

export default function App() {
  const canvasElementRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const clipboardRef = useRef(null);

  const [activeTool, setActiveTool] = useState("project");
  const [studioMode, setStudioMode] = useState("graphic"); // "graphic" or "video"
  const [selectedObject, setSelectedObject] = useState(null);
  const [canvasObjects, setCanvasObjects] = useState([]);
  
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [toast, setToast] = useState("");

  const [canvasSize, setCanvasSize] = useState({ w: 1080, h: 1080 });
  const [canvasBg, setCanvasBg] = useState("#ffffff");
  const [showGrid, setShowGrid] = useState(false);

  // Video Suite State
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(15);
  const [currentTime, setCurrentTime] = useState(0);
  const [tracks, setTracks] = useState([
    { id: "track-v1", name: "Video Main", type: "video", clips: [] },
    { id: "track-a1", name: "Audio Track", type: "audio", clips: [] },
    { id: "track-t1", name: "Text / Overlays", type: "text", clips: [] }
  ]);
  const [activeVideoElement, setActiveVideoElement] = useState(null);
  const [videoPlaybackSpeed, setVideoPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const [objProps, setObjProps] = useState({
    opacity: 1, fontFamily: "Arial", fontSize: 60, fontWeight: "normal",
    fontStyle: "normal", underline: false, textAlign: "left", fill: "#5c4dff",
    stroke: "", strokeWidth: 0, textContent: ""
  });

  const [drawProps, setDrawProps] = useState({ color: "#111111", size: 5, type: 'pencil' });
  const [qrText, setQrText] = useState("https://github.com");

  const showMsg = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2200); };

  const resizeCanvas = useCallback(() => {
    if (!canvasContainerRef.current || !canvasRef.current) return;
    const containerWidth = canvasContainerRef.current.clientWidth;
    const containerHeight = canvasContainerRef.current.clientHeight;
    if (containerWidth === 0 || containerHeight === 0) return;

    const padding = 30;
    const scale = Math.min((containerWidth - padding) / canvasSize.w, (containerHeight - padding) / canvasSize.h, 1);
    
    const wrap = document.querySelector('.canvas-shadow-wrapper');
    if (wrap) {
      wrap.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }
    canvasRef.current.calcOffset();
  }, [canvasSize.w, canvasSize.h]);

  useEffect(() => {
    if (!canvasElementRef.current) return;
    const canvas = new fabric.Canvas(canvasElementRef.current, {
      width: canvasSize.w,
      height: canvasSize.h,
      backgroundColor: canvasBg,
      preserveObjectStacking: true,
      selection: true,
    });
    canvasRef.current = canvas;

    const updateSelection = () => {
      const obj = canvas.getActiveObject();
      setSelectedObject(obj || null);
      if (obj) {
        setObjProps({
          opacity: obj.opacity ?? 1,
          fontFamily: obj.fontFamily || "Arial",
          fontSize: obj.fontSize || 60,
          fontWeight: obj.fontWeight || "normal",
          fontStyle: obj.fontStyle || "normal",
          underline: obj.underline || false,
          textAlign: obj.textAlign || "left",
          fill: obj.fill || "#5c4dff",
          stroke: obj.stroke || "",
          strokeWidth: obj.strokeWidth || 0,
          textContent: obj.type === 'i-text' || obj.type === 'textbox' ? obj.text : ""
        });
      }
      setCanvasObjects([...canvas.getObjects()]);
    };

    canvas.on("selection:created", updateSelection);
    canvas.on("selection:updated", updateSelection);
    canvas.on("selection:cleared", updateSelection);
    canvas.on("object:modified", () => { updateSelection(); saveHistory(); });
    canvas.on("object:added", updateSelection);
    canvas.on("object:removed", updateSelection);

    window.addEventListener('resize', resizeCanvas);
    const timer = setTimeout(resizeCanvas, 150); 

    return () => { 
      window.removeEventListener('resize', resizeCanvas); 
      clearTimeout(timer);
      canvas.dispose(); 
    };
  }, [canvasSize.w, canvasSize.h, resizeCanvas]); 

  // Master Video Frame Render Loop
  useEffect(() => {
    let animationFrameId;
    const renderLoop = () => {
      if (canvasRef.current) {
        canvasRef.current.renderAll();
      }
      if (isPlaying && activeVideoElement) {
        setCurrentTime(activeVideoElement.currentTime);
        if (activeVideoElement.ended) {
          setIsPlaying(false);
        } else {
          animationFrameId = requestAnimationFrame(renderLoop);
        }
      }
    };
    if (isPlaying) {
      animationFrameId = requestAnimationFrame(renderLoop);
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, activeVideoElement]);

  const saveHistory = useCallback(() => {
    if (!canvasRef.current) return;
    const json = JSON.stringify(canvasRef.current.toJSON(['customName', 'selectable']));
    setHistory(prev => {
      const current = prev.slice(0, historyIndex + 1);
      if (current[current.length - 1] === json) return prev;
      const newHist = [...current, json];
      if (newHist.length > 20) newHist.shift(); 
      return newHist;
    });
    setHistoryIndex(prev => prev >= 20 ? 19 : prev + 1);
  }, [historyIndex]);

  const loadCanvasJSON = async (json) => {
    if (!canvasRef.current) return;
    await new Promise(resolve => canvasRef.current.loadFromJSON(JSON.parse(json), resolve));
    canvasRef.current.renderAll();
    setCanvasObjects([...canvasRef.current.getObjects()]);
    showMsg("State Updated");
  };

  const undo = () => { if (historyIndex > 0) { const idx = historyIndex - 1; loadCanvasJSON(history[idx]); setHistoryIndex(idx); } };
  const redo = () => { if (historyIndex < history.length - 1) { const idx = historyIndex + 1; loadCanvasJSON(history[idx]); setHistoryIndex(idx); } };

  const modifyObj = (key, val) => {
    const obj = canvasRef.current?.getActiveObject();
    if (!obj) return;
    obj.set(key, val);
    canvasRef.current.renderAll();
    setObjProps(p => ({ ...p, [key]: val }));
    saveHistory();
  };

  const duplicateObject = () => {
    const obj = canvasRef.current?.getActiveObject();
    if (!obj) return;
    obj.clone((cloned) => {
      canvasRef.current.discardActiveObject();
      cloned.set({ left: obj.left + 25, top: obj.top + 25, evented: true });
      canvasRef.current.add(cloned);
      canvasRef.current.setActiveObject(cloned);
      canvasRef.current.requestRenderAll();
      saveHistory();
      showMsg("Duplicated Object");
    });
  };

  const deleteObject = () => {
    const o = canvasRef.current?.getActiveObject();
    if (o) { 
      canvasRef.current.remove(o);
      canvasRef.current.discardActiveObject();
      saveHistory(); 
      showMsg("Deleted Item");
    }
  };

  const addShape = (type) => {
    const center = { left: canvasSize.w/2, top: canvasSize.h/2, originX: 'center', originY: 'center', fill: '#5c4dff' };
    let shape;
    if (type === 'rect') shape = new fabric.Rect({ ...center, width: 250, height: 250, customName: "Rectangle" });
    if (type === 'circle') shape = new fabric.Circle({ ...center, radius: 120, customName: "Circle" });
    if (type === 'triangle') shape = new fabric.Triangle({ ...center, width: 250, height: 250, customName: "Triangle" });
    if (type === 'star') shape = new fabric.Polygon([{x: 75, y: 0}, {x: 98, y: 46}, {x: 149, y: 53}, {x: 112, y: 89}, {x: 121, y: 140}, {x: 75, y: 115}, {x: 28, y: 140}, {x: 37, y: 89}, {x: 0, y: 53}, {x: 51, y: 46}], { ...center, scaleX: 2, scaleY: 2, customName: "Star" });
    if (shape) { canvasRef.current.add(shape); canvasRef.current.setActiveObject(shape); saveHistory(); showMsg("Shape Added"); }
  };

  const addText = () => {
    const text = new fabric.IText("Double tap to edit", { left: canvasSize.w/2, top: canvasSize.h/2, originX: "center", originY: "center", fontFamily: "Arial", fontSize: 60, fill: "#111", customName: "Text Box" });
    canvasRef.current.add(text); canvasRef.current.setActiveObject(text); saveHistory();
    showMsg("Text Added");
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      fabric.Image.fromURL(event.target.result).then((img) => {
        img.scaleToWidth(400);
        img.set({ left: canvasSize.w / 2 - 200, top: canvasSize.h / 2 - 200, customName: "Uploaded Image" });
        canvasRef.current.add(img);
        canvasRef.current.setActiveObject(img);
        saveHistory();
        showMsg("Image Added to Canvas");
      });
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const videoUrl = URL.createObjectURL(file);
    const vidEl = document.createElement('video');
    vidEl.src = videoUrl;
    vidEl.crossOrigin = 'anonymous';
    vidEl.muted = isMuted;
    vidEl.load();

    vidEl.onloadedmetadata = () => {
      setVideoDuration(vidEl.duration);
      vidEl.width = vidEl.videoWidth;
      vidEl.height = vidEl.videoHeight;

      const fabricImage = new fabric.FabricImage(vidEl, {
        left: 0,
        top: 0,
        scaleX: canvasSize.w / vidEl.videoWidth,
        scaleY: canvasSize.h / vidEl.videoHeight,
        customName: file.name
      });

      canvasRef.current.add(fabricImage);
      canvasRef.current.setActiveObject(fabricImage);
      setActiveVideoElement(vidEl);

      setTracks(prev => prev.map(t => {
        if (t.type === 'video') {
          return {
            ...t,
            clips: [...t.clips, { id: Date.now(), name: file.name, duration: vidEl.duration, element: vidEl }]
          };
        }
        return t;
      }));

      saveHistory();
      showMsg("Video Loaded on Timeline!");
    };
  };

  const togglePlayback = () => {
    if (!activeVideoElement) {
      showMsg("Import a video clip first");
      return;
    }
    if (isPlaying) {
      activeVideoElement.pause();
      setIsPlaying(false);
    } else {
      activeVideoElement.playbackRate = videoPlaybackSpeed;
      activeVideoElement.play();
      setIsPlaying(true);
    }
  };

  const handleTimelineScrub = (e) => {
    const targetTime = Number(e.target.value);
    setCurrentTime(targetTime);
    if (activeVideoElement) {
      activeVideoElement.currentTime = targetTime;
      canvasRef.current.requestRenderAll();
    }
  };

  // Top Control Deck Component
  const TopControlPanel = () => {
    return (
      <div className="top-multi-bar">
        {/* ROW 1: Master Controls */}
        <div className="top-toolbar-row">
          <div className="tb-section-group">
            <button className="tb-btn" onClick={undo} disabled={historyIndex <= 0} title="Undo"><Undo2 size={15}/> Undo</button>
            <button className="tb-btn" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo"><Redo2 size={15}/> Redo</button>
            <div className="tb-divider"/>
            <button className="tb-btn" onClick={duplicateObject} title="Duplicate"><CopyPlus size={15}/> Duplicate</button>
            <button className="tb-btn danger-text" onClick={deleteObject} title="Delete"><Trash2 size={15}/> Delete</button>
          </div>

          <div className="tb-section-group">
            <span className="tb-label">Studio Mode:</span>
            <div className="mode-switch-group">
              <button className={`mode-btn ${studioMode === 'graphic' ? 'active' : ''}`} onClick={() => {
                setStudioMode('graphic');
                setCanvasSize({ w: 1080, h: 1080 });
                canvasRef.current.setDimensions({ width: 1080, height: 1080 });
                showMsg("Graphic Design Mode");
              }}><ImgIcon size={14}/> Graphic</button>
              <button className={`mode-btn ${studioMode === 'video' ? 'active' : ''}`} onClick={() => {
                setStudioMode('video');
                setCanvasSize({ w: 1280, h: 720 });
                canvasRef.current.setDimensions({ width: 1280, height: 720 });
                showMsg("Video Editing Mode");
              }}><Film size={14}/> Video</button>
            </div>
            <div className="tb-divider"/>
            <button className="tb-btn primary" onClick={() => { 
              const link = document.createElement('a'); 
              link.download = 'creativa-design-export.png'; 
              link.href = canvasRef.current.toDataURL({format:'png', quality: 1}); 
              link.click(); 
              showMsg("Export Successful!"); 
            }}><Download size={15}/> Export</button>
          </div>
        </div>

        {/* ROW 2: Contextual Tools Panel */}
        <div className="top-toolbar-row secondary-row custom-scrollbar">
          {activeTool === "project" && (
            <>
              <button className="tb-btn primary" onClick={() => { setCanvasSize({w: 1200, h: 630}); canvasRef.current.setDimensions({width: 1200, height: 630}); showMsg("Resized to Social Banner"); }}><Maximize size={15}/> Social Banner (1200x630)</button>
              <button className="tb-btn" onClick={() => setShowGrid(!showGrid)}><Grid size={15}/> {showGrid ? 'Hide Grid' : 'Show Grid'}</button>
              <button className="tb-btn danger-text" onClick={() => { canvasRef.current.clear(); canvasRef.current.backgroundColor = canvasBg; saveHistory(); showMsg("Canvas Cleared"); }}><Trash2 size={15}/> Clear Canvas</button>
            </>
          )}

          {activeTool === "text" && (
            <>
              <button className="tb-btn primary" onClick={addText}><Type size={15}/> Add Text Box</button>
              <select className="tb-select" value={objProps.fontFamily} onChange={(e) => modifyObj("fontFamily", e.target.value)}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <div className="tb-group">
                 <button className={`tb-icon-btn ${objProps.fontWeight === 'bold' ? 'active' : ''}`} onClick={() => modifyObj('fontWeight', objProps.fontWeight === 'bold' ? 'normal' : 'bold')}><Bold size={15}/></button>
                 <button className={`tb-icon-btn ${objProps.fontStyle === 'italic' ? 'active' : ''}`} onClick={() => modifyObj('fontStyle', objProps.fontStyle === 'italic' ? 'normal' : 'italic')}><Italic size={15}/></button>
              </div>
              <div className="tb-input-group"><label>Size</label><input type="number" value={objProps.fontSize} onChange={e=>modifyObj("fontSize", Number(e.target.value))} /></div>
              <div className="tb-input-group"><label>Color</label><input type="color" value={objProps.fill} onChange={e=>modifyObj("fill", e.target.value)} /></div>
            </>
          )}

          {activeTool === "shapes" && (
            <>
              <span className="tb-label">Shapes:</span>
              <button className="tb-btn" onClick={()=>addShape('rect')}><Square size={15}/> Rectangle</button>
              <button className="tb-btn" onClick={()=>addShape('circle')}><Circle size={15}/> Circle</button>
              <button className="tb-btn" onClick={()=>addShape('triangle')}><Triangle size={15}/> Triangle</button>
              <button className="tb-btn" onClick={()=>addShape('star')}><Star size={15}/> Star</button>
            </>
          )}

          {activeTool === "video" && (
            <>
              <button className="tb-btn primary" onClick={() => videoInputRef.current?.click()}><Video size={15}/> Import Video Clip</button>
              <input type="file" ref={videoInputRef} style={{display:'none'}} accept="video/*" onChange={handleVideoUpload} />
              <button className="tb-btn" onClick={togglePlayback}>
                {isPlaying ? <Pause size={15}/> : <Play size={15}/>} {isPlaying ? "Pause Preview" : "Play Preview"}
              </button>
            </>
          )}

          {activeTool === "timeline" && (
            <>
              <button className="tb-btn primary" onClick={togglePlayback}>
                {isPlaying ? <Pause size={15}/> : <Play size={15}/>} {isPlaying ? "Pause" : "Play Track"}
              </button>
              <div className="tb-input-group" style={{width: 250}}>
                <label>Scrubber</label>
                <input type="range" min="0" max={videoDuration || 15} step="0.05" value={currentTime} onChange={handleTimelineScrub} style={{width:'100%'}} />
              </div>
            </>
          )}

          {activeTool === "uploads" && (
            <>
              <button className="tb-btn primary" onClick={() => fileInputRef.current?.click()}><Upload size={15}/> Upload Local Image</button>
              <input type="file" ref={fileInputRef} style={{display:'none'}} accept="image/*" onChange={handleImageUpload} />
            </>
          )}

          {activeTool === "filters" && (
            <>
              <button className="tb-btn primary" onClick={() => {
                const obj = canvasRef.current?.getActiveObject();
                if (!obj) { showMsg("Select an image first"); return; }
                obj.filters.push(new fabric.Image.filters.RemoveColor({ color: '#ffffff', distance: 0.2 }));
                obj.applyFilters();
                canvasRef.current.requestRenderAll();
                saveHistory();
                showMsg("AI Background Removed!");
              }}><Wand2 size={15}/> AI Background Remover</button>
              <button className="tb-btn" onClick={() => {
                const obj = canvasRef.current?.getActiveObject();
                if (!obj) { showMsg("Select an image first"); return; }
                obj.filters.push(new fabric.Image.filters.Grayscale());
                obj.applyFilters();
                canvasRef.current.requestRenderAll();
                saveHistory();
                showMsg("Grayscale Applied");
              }}><Sparkles size={15}/> Grayscale</button>
            </>
          )}

          {activeTool === "background" && (
            <>
              <div className="tb-input-group"><label>Background Color</label><input type="color" value={canvasBg} onChange={e => { setCanvasBg(e.target.value); canvasRef.current.backgroundColor = e.target.value; canvasRef.current.renderAll(); saveHistory(); }} /></div>
            </>
          )}

          {activeTool === "qrcode" && (
            <>
              <div className="tb-input-group" style={{width: 200}}>
                <label>URL</label>
                <input type="text" value={qrText} onChange={e => setQrText(e.target.value)} style={{border:'none', background:'transparent', outline:'none', width:'100%', fontSize:12}} />
              </div>
              <button className="tb-btn primary" onClick={() => {
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}`;
                fabric.Image.fromURL(qrUrl, { crossOrigin: 'anonymous' }).then((img) => {
                  img.scaleToWidth(200);
                  img.set({ left: canvasSize.w / 2 - 100, top: canvasSize.h / 2 - 100, customName: "QR Code" });
                  canvasRef.current.add(img);
                  canvasRef.current.setActiveObject(img);
                  saveHistory();
                  showMsg("QR Generated!");
                });
              }}><QrCode size={15}/> Generate QR</button>
            </>
          )}

          {activeTool === "layers" && (
            <>
               <span className="tb-label">Layers:</span>
               {canvasObjects.slice().reverse().map((obj, i) => (
                  <div key={i} className={`tb-layer-chip ${selectedObject === obj ? 'active' : ''}`} onClick={() => { canvasRef.current.setActiveObject(obj); canvasRef.current.renderAll(); }}>
                     {obj.customName || obj.type}
                     <div style={{display:'flex', gap:2}}>
                       <button className="tb-icon-btn small" onClick={(e)=>{e.stopPropagation(); canvasRef.current.bringForward(obj); setCanvasObjects([...canvasRef.current.getObjects()]);}}><ChevronUp size={12}/></button>
                       <button className="tb-icon-btn small" onClick={(e)=>{e.stopPropagation(); canvasRef.current.sendBackwards(obj); setCanvasObjects([...canvasRef.current.getObjects()]);}}><ChevronDown size={12}/></button>
                     </div>
                  </div>
               ))}
            </>
          )}

          {!["project", "text", "shapes", "video", "timeline", "uploads", "filters", "background", "qrcode", "layers"].includes(activeTool) && (
            <span className="tb-label" style={{color: '#64748b'}}>Active Tool: <strong>{activeTool.toUpperCase()}</strong></span>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app-container">
        
        {/* TOP BRAND HEADER */}
        <header className="top-nav">
          <div className="logo">
            <div className="logo-icon">C</div>
            <span className="logo-text">Creativa Pro Studio</span>
          </div>
          <div className="nav-actions">
            <span className="workspace-status">{canvasSize.w} x {canvasSize.h}px ({studioMode === 'video' ? 'Video Mode' : 'Graphic Mode'})</span>
          </div>
        </header>

        {/* TOP CONTROL DECK */}
        <TopControlPanel />

        <div className="main-body">
          {/* PRIMARY TOOLBAR: 20 Tools arranged in 10-Row x 2-Column Grid */}
          <aside className="primary-toolbar custom-scrollbar">
            {TOOLS.map(t => (
              <button key={t.id} className={`sidebar-btn ${activeTool === t.id ? 'active' : ''}`} onClick={() => {
                setActiveTool(t.id);
                if(t.id === 'video' || t.id === 'timeline') setStudioMode('video');
              }} title={t.label}>
                <t.icon size={18} />
                <span className="tool-label">{t.label}</span>
              </button>
            ))}
          </aside>

          {/* MAIN WORKSPACE CANVAS CONTAINER */}
          <section className="workspace-container">
            <div className="canvas-scroll-area" ref={canvasContainerRef}>
              <div className="canvas-shadow-wrapper">
                 <canvas ref={canvasElementRef} />
              </div>
            </div>

            {/* VIDEO TIMELINE DOCK (Auto-rendered in video mode) */}
            {studioMode === 'video' && (
              <div className="video-timeline-dock">
                <div className="timeline-toolbar-header">
                  <div className="timeline-controls-left">
                    <button className="tb-btn primary small-btn" onClick={togglePlayback}>
                      {isPlaying ? <Pause size={13}/> : <Play size={13}/>} {isPlaying ? "Pause" : "Play"}
                    </button>
                    <span className="timecode-display">
                      {currentTime.toFixed(1)}s / {videoDuration.toFixed(1)}s
                    </span>
                  </div>
                  <div className="timeline-controls-right">
                    <input type="range" min="0" max={videoDuration || 15} step="0.05" value={currentTime} onChange={handleTimelineScrub} className="timeline-global-scrubber" />
                  </div>
                </div>

                <div className="timeline-tracks-container custom-scrollbar">
                  {tracks.map(track => (
                    <div key={track.id} className="timeline-track-row">
                      <div className="track-label-badge">
                        {track.type === 'video' && <Video size={12}/>}
                        {track.type === 'audio' && <Music size={12}/>}
                        {track.type === 'text' && <Type size={12}/>}
                        <span>{track.name}</span>
                      </div>
                      <div className="track-clips-lane">
                        {track.clips.length === 0 ? (
                          <span className="empty-lane-hint">Import clips via Video tool</span>
                        ) : (
                          track.clips.map(clip => (
                            <div key={clip.id} className="timeline-clip-block">
                              <span>{clip.name}</span>
                              <span className="clip-duration-tag">{clip.duration ? `${clip.duration.toFixed(1)}s` : '30s'}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
        
        {toast && <div className="toast-msg"><Check size={16} /> {toast}</div>}
      </div>
    </>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', sans-serif; background-color: #f3f4f6; overflow: hidden; width: 100vw; height: 100vh; }
button, select, input { font-family: inherit; }
button { border: none; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }

.app-container { display: flex; flex-direction: column; height: 100vh; width: 100vw; position: relative; overflow: hidden; }
.custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

.top-nav { height: 48px; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; z-index: 55; flex-shrink: 0;}
.logo { display: flex; align-items: center; gap: 10px; }
.logo-icon { width: 26px; height: 26px; border-radius: 6px; background: #5c4dff; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px;}
.logo-text { font-size: 15px; font-weight: 700; color: #fff;}
.workspace-status { font-size: 12px; color: #94a3b8; }

/* DUAL-ROW TOP CONTROLS */
.top-multi-bar { display: flex; flex-direction: column; background: #fff; border-bottom: 1px solid #e5e7eb; flex-shrink: 0; z-index: 45; }
.top-toolbar-row { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 15px; border-bottom: 1px solid #f1f5f9; gap: 10px; }
.top-toolbar-row.secondary-row { background: #f8fafc; overflow-x: auto; white-space: nowrap; justify-content: flex-start; }

.tb-section-group { display: flex; align-items: center; gap: 8px; }
.tb-btn { padding: 0 10px; height: 30px; border-radius: 6px; background: #f1f5f9; border: 1px solid #e2e8f0; color: #334155; font-size: 12px; font-weight: 600; transition: 0.2s; white-space: nowrap;}
.tb-btn:hover:not(:disabled) { background: #e2e8f0; }
.tb-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.tb-btn.active { background: #eef2ff; color: #5c4dff; border-color: #5c4dff; }
.tb-btn.primary { background: #5c4dff; color: #fff; border-color: #5c4dff; }
.tb-btn.danger-text { color: #ef4444; border-color: #fee2e2; background: #fef2f2; }
.tb-btn.danger-text:hover { background: #fee2e2; }
.small-btn { height: 26px; font-size: 11px; padding: 0 8px; }

.mode-switch-group { display: flex; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px; gap: 2px; }
.mode-btn { padding: 0 10px; height: 26px; border-radius: 4px; font-size: 11px; font-weight: 600; color: #475569; display: flex; align-items: center; gap: 4px; }
.mode-btn.active { background: #5c4dff; color: #fff; }

.tb-icon-btn { width: 30px; height: 30px; border-radius: 6px; background: #f1f5f9; border: 1px solid #e2e8f0; color: #475569; transition: 0.2s; }
.tb-icon-btn:hover { background: #e2e8f0; }
.tb-divider { width: 1px; height: 20px; background: #e2e8f0; flex-shrink: 0; margin: 0 4px; }
.tb-input-group { display: flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0 8px; height: 30px;}
.tb-input-group label { font-size: 11px; font-weight: 600; color: #64748b; }
.tb-input-group input[type="number"] { width: 40px; border: none; background: transparent; font-size: 12px; font-weight: 500; outline: none; }
.tb-select { height: 30px; padding: 0 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px; outline: none; background: #fff;}
.tb-label { font-size: 12px; font-weight: 600; color: #64748b; margin-right: 4px; display: flex; align-items: center; gap: 4px; }

.main-body { display: flex; flex: 1; overflow: hidden; position: relative; width: 100%; height: 100%; }

/* PRIMARY TOOLBAR: 20 Tools arranged precisely in 10 rows x 2 columns on desktop */
.primary-toolbar { 
  width: 140px; 
  background: #fff; 
  border-right: 1px solid #e5e7eb; 
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: 52px;
  gap: 5px;
  padding: 8px; 
  z-index: 40; 
  overflow-y: auto; 
  flex-shrink: 0;
}
.sidebar-btn { 
  flex-direction: column; 
  height: 100%; 
  width: 100%; 
  border-radius: 8px; 
  color: #64748b; 
  font-size: 9px; 
  font-weight: 600; 
  transition: 0.2s; 
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  flex-shrink: 0;
  padding: 2px;
}
.sidebar-btn:hover { background: #f1f5f9; color: #0f172a; }
.sidebar-btn.active { background: #eef2ff; color: #5c4dff; border-color: #c7d2fe; }
.tool-label { margin-top: 2px; font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

.workspace-container { flex: 1; display: flex; flex-direction: column; background: #f1f5f9; overflow: hidden; position: relative; }
.canvas-scroll-area { flex: 1; overflow: hidden; display: flex; align-items: center; justify-content: center; padding: 20px; position: relative; width: 100%; height: 100%; }
.canvas-shadow-wrapper { background: #000; box-shadow: 0 10px 40px rgba(0,0,0,0.15); border-radius: 4px; overflow: hidden; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transform-origin: center center;}

/* PRO VIDEO EDITING TIMELINE PANEL */
.video-timeline-dock {
  height: 150px;
  background: #1e293b;
  border-top: 1px solid #334155;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 45;
  color: #fff;
}
.timeline-toolbar-header {
  height: 36px;
  background: #0f172a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  border-bottom: 1px solid #334155;
}
.timeline-controls-left { display: flex; align-items: center; gap: 12px; }
.timecode-display { font-family: monospace; font-size: 12px; color: #38bdf8; }
.timeline-controls-right { flex: 1; max-width: 500px; margin-left: 20px; }
.timeline-global-scrubber { width: 100%; cursor: pointer; accent-color: #5c4dff; }

.timeline-tracks-container {
  flex: 1;
  overflow-y: auto;
  padding: 6px 15px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.timeline-track-row {
  height: 30px;
  background: #0f172a;
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  gap: 10px;
  border: 1px solid #334155;
}
.track-label-badge {
  width: 120px;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.track-clips-lane {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
}
.empty-lane-hint { font-size: 11px; color: #64748b; font-style: italic; }
.timeline-clip-block {
  background: #5c4dff;
  color: white;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 22px;
}
.clip-duration-tag { background: rgba(0,0,0,0.25); padding: 1px 4px; border-radius: 3px; font-size: 9px; }

.toast-msg { position: fixed; bottom: 170px; left: 50%; transform: translateX(-50%); background: #1e293b; color: white; padding: 10px 20px; border-radius: 8px; display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; z-index: 9999; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }

/* RESPONSIVE MOBILE ADAPTATION */
@media (max-width: 900px) {
  .app-container { height: 100vh; overflow: hidden; }
  .main-body { flex-direction: column; height: calc(100vh - 48px - 88px); }
  .primary-toolbar { 
    position: fixed; 
    bottom: 0; 
    left: 0; 
    width: 100%; 
    height: 70px; 
    display: flex;
    grid-template-columns: none;
    flex-direction: row; 
    overflow-x: auto; 
    border-right: none; 
    border-top: 1px solid #e5e7eb; 
    padding: 5px 10px;
    gap: 6px;
    background: #fff;
    z-index: 60;
  }
  .sidebar-btn { flex: 0 0 50px; height: 55px; border-radius: 8px; }
  .canvas-scroll-area { padding-bottom: 70px; }
}
`;