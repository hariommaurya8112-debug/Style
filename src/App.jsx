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

  const [qrText, setQrText] = useState("https://github.com");

  const showMsg = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2200); };

  const resizeCanvas = useCallback(() => {
    if (!canvasContainerRef.current || !canvasRef.current) return;
    const containerWidth = canvasContainerRef.current.clientWidth;
    const containerHeight = canvasContainerRef.current.clientHeight;
    if (containerWidth === 0 || containerHeight === 0) return;

    const padding = window.innerWidth <= 900 ? 50 : 40;
    const scale = Math.min((containerWidth - padding) / canvasSize.w, (containerHeight - padding) / canvasSize.h);
    
    const wrap = document.querySelector('.canvas-shadow-wrapper');
    if (wrap) {
      wrap.style.width = `${canvasSize.w}px`;
      wrap.style.height = `${canvasSize.h}px`;
      wrap.style.transform = `translate(-50%, -50%) scale(${scale})`;
      wrap.style.transformOrigin = 'center center';
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

    const handleTextEditing = (e) => {
      if (e.target && (e.target.type === 'i-text' || e.target.type === 'textbox')) {
        setTimeout(() => {
          if (canvasRef.current) {
            canvasRef.current.calcOffset();
            canvasRef.current.requestRenderAll();
          }
        }, 50);
      }
    };

    canvas.on("selection:created", updateSelection);
    canvas.on("selection:updated", updateSelection);
    canvas.on("selection:cleared", updateSelection);
    canvas.on("object:modified", () => { updateSelection(); saveHistory(); });
    canvas.on("object:added", updateSelection);
    canvas.on("object:removed", updateSelection);
    canvas.on("text:editing:entered", handleTextEditing);
    canvas.on("text:editing:exited", () => { updateSelection(); saveHistory(); });

    window.addEventListener('resize', resizeCanvas);
    const timer = setTimeout(() => {
      resizeCanvas();
      canvas.requestRenderAll();
    }, 150); 

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

  const TopControlPanel = () => {
    return (
      <div className="top-multi-bar">
        {/* ROW 1: Non-scrolling primary master actions */}
        <div className="top-toolbar-row primary-bar-row">
          <div className="tb-section-group">
            <button className="tb-btn" onClick={undo} disabled={historyIndex <= 0} title="Undo"><Undo2 size={14}/> Undo</button>
            <button className="tb-btn" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo"><Redo2 size={14}/> Redo</button>
            <div className="tb-divider"/>
            <button className="tb-btn" onClick={duplicateObject} title="Duplicate"><CopyPlus size={14}/> Dup</button>
            <button className="tb-btn danger-text" onClick={deleteObject} title="Delete"><Trash2 size={14}/> Del</button>
          </div>

          <div className="tb-section-group">
            <div className="mode-switch-group">
              <button className={`mode-btn ${studioMode === 'graphic' ? 'active' : ''}`} onClick={() => {
                setStudioMode('graphic');
                setCanvasSize({ w: 1080, h: 1080 });
                if (canvasRef.current) canvasRef.current.setDimensions({ width: 1080, height: 1080 });
                showMsg("Graphic Mode");
              }}><ImgIcon size={13}/> Graphic</button>
              <button className={`mode-btn ${studioMode === 'video' ? 'active' : ''}`} onClick={() => {
                setStudioMode('video');
                setCanvasSize({ w: 1280, h: 720 });
                if (canvasRef.current) canvasRef.current.setDimensions({ width: 1280, height: 720 });
                showMsg("Video Mode");
              }}><Film size={13}/> Video</button>
            </div>
            <button className="tb-btn primary" onClick={() => { 
              const link = document.createElement('a'); 
              link.download = 'creativa-export.png'; 
              link.href = canvasRef.current.toDataURL({format:'png', quality: 1}); 
              link.click(); 
              showMsg("Exported!"); 
            }}><Download size={14}/> Export</button>
          </div>
        </div>

        {/* ROW 2: Clean tool contextual drawer */}
        <div className="top-toolbar-row secondary-row custom-scrollbar">
          {activeTool === "project" && (
            <>
              <button className="tb-btn primary" onClick={() => { setCanvasSize({w: 1200, h: 630}); if(canvasRef.current) canvasRef.current.setDimensions({width: 1200, height: 630}); showMsg("Resized Banner"); }}><Maximize size={14}/> Banner (1200x630)</button>
              <button className="tb-btn" onClick={() => setShowGrid(!showGrid)}><Grid size={14}/> {showGrid ? 'Hide Grid' : 'Grid'}</button>
              <button className="tb-btn danger-text" onClick={() => { canvasRef.current.clear(); canvasRef.current.backgroundColor = canvasBg; saveHistory(); showMsg("Cleared"); }}><Trash2 size={14}/> Clear</button>
            </>
          )}

          {activeTool === "text" && (
            <>
              <button className="tb-btn primary" onClick={addText}><Type size={14}/> Add Text</button>
              <select className="tb-select" value={objProps.fontFamily} onChange={(e) => modifyObj("fontFamily", e.target.value)}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <div className="tb-group" style={{display:'flex', gap:2}}>
                 <button className={`tb-icon-btn ${objProps.fontWeight === 'bold' ? 'active' : ''}`} onClick={() => modifyObj('fontWeight', objProps.fontWeight === 'bold' ? 'normal' : 'bold')}><Bold size={14}/></button>
                 <button className={`tb-icon-btn ${objProps.fontStyle === 'italic' ? 'active' : ''}`} onClick={() => modifyObj('fontStyle', objProps.fontStyle === 'italic' ? 'normal' : 'italic')}><Italic size={14}/></button>
              </div>
              <div className="tb-input-group"><label>Sz</label><input type="number" value={objProps.fontSize} onChange={e=>modifyObj("fontSize", Number(e.target.value))} /></div>
              <div className="tb-input-group"><label>Col</label><input type="color" value={objProps.fill} onChange={e=>modifyObj("fill", e.target.value)} /></div>
            </>
          )}

          {activeTool === "shapes" && (
            <>
              <span className="tb-label">Shapes:</span>
              <button className="tb-btn" onClick={()=>addShape('rect')}><Square size={14}/> Rect</button>
              <button className="tb-btn" onClick={()=>addShape('circle')}><Circle size={14}/> Circle</button>
              <button className="tb-btn" onClick={()=>addShape('triangle')}><Triangle size={14}/> Tri</button>
              <button className="tb-btn" onClick={()=>addShape('star')}><Star size={14}/> Star</button>
            </>
          )}

          {activeTool === "video" && (
            <>
              <button className="tb-btn primary" onClick={() => videoInputRef.current?.click()}><Video size={14}/> Upload Video</button>
              <input type="file" ref={videoInputRef} style={{display:'none'}} accept="video/*" onChange={handleVideoUpload} />
              <button className="tb-btn" onClick={togglePlayback}>
                {isPlaying ? <Pause size={14}/> : <Play size={14}/>} {isPlaying ? "Pause" : "Play"}
              </button>
            </>
          )}

          {activeTool === "timeline" && (
            <>
              <button className="tb-btn primary" onClick={togglePlayback}>
                {isPlaying ? <Pause size={14}/> : <Play size={14}/>} {isPlaying ? "Pause" : "Play"}
              </button>
              <div className="tb-input-group" style={{width: 200}}>
                <label>Time</label>
                <input type="range" min="0" max={videoDuration || 15} step="0.05" value={currentTime} onChange={handleTimelineScrub} style={{width:'100%'}} />
              </div>
            </>
          )}

          {activeTool === "uploads" && (
            <>
              <button className="tb-btn primary" onClick={() => fileInputRef.current?.click()}><Upload size={14}/> Upload Image</button>
              <input type="file" ref={fileInputRef} style={{display:'none'}} accept="image/*" onChange={handleImageUpload} />
            </>
          )}

          {activeTool === "filters" && (
            <>
              <button className="tb-btn primary" onClick={() => {
                const obj = canvasRef.current?.getActiveObject();
                if (!obj) { showMsg("Select image first"); return; }
                obj.filters.push(new fabric.Image.filters.RemoveColor({ color: '#ffffff', distance: 0.2 }));
                obj.applyFilters();
                canvasRef.current.requestRenderAll();
                saveHistory();
                showMsg("BG Removed!");
              }}><Wand2 size={14}/> AI BG Remover</button>
              <button className="tb-btn" onClick={() => {
                const obj = canvasRef.current?.getActiveObject();
                if (!obj) { showMsg("Select image first"); return; }
                obj.filters.push(new fabric.Image.filters.Grayscale());
                obj.applyFilters();
                canvasRef.current.requestRenderAll();
                saveHistory();
                showMsg("Grayscale");
              }}><Sparkles size={14}/> Grayscale</button>
            </>
          )}

          {activeTool === "background" && (
            <>
              <div className="tb-input-group"><label>BG Color</label><input type="color" value={canvasBg} onChange={e => { setCanvasBg(e.target.value); canvasRef.current.backgroundColor = e.target.value; canvasRef.current.renderAll(); saveHistory(); }} /></div>
            </>
          )}

          {activeTool === "qrcode" && (
            <>
              <div className="tb-input-group" style={{width: 160}}>
                <label>URL</label>
                <input type="text" value={qrText} onChange={e => setQrText(e.target.value)} style={{border:'none', background:'transparent', outline:'none', width:'100%', fontSize:11}} />
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
              }}><QrCode size={14}/> Generate</button>
            </>
          )}

          {activeTool === "layers" && (
            <>
               <span className="tb-label">Layers:</span>
               {canvasObjects.slice().reverse().map((obj, i) => (
                  <div key={i} className={`tb-layer-chip ${selectedObject === obj ? 'active' : ''}`} onClick={() => { canvasRef.current.setActiveObject(obj); canvasRef.current.renderAll(); }}>
                     {obj.customName || obj.type}
                     <div style={{display:'flex', gap:2}}>
                       <button className="tb-icon-btn small" onClick={(e)=>{e.stopPropagation(); canvasRef.current.bringForward(obj); setCanvasObjects([...canvasRef.current.getObjects()]);}}><ChevronUp size={10}/></button>
                       <button className="tb-icon-btn small" onClick={(e)=>{e.stopPropagation(); canvasRef.current.sendBackwards(obj); setCanvasObjects([...canvasRef.current.getObjects()]);}}><ChevronDown size={10}/></button>
                     </div>
                  </div>
               ))}
            </>
          )}

          {!["project", "text", "shapes", "video", "timeline", "uploads", "filters", "background", "qrcode", "layers"].includes(activeTool) && (
            <span className="tb-label" style={{color: '#64748b'}}>Tool: <strong>{activeTool.toUpperCase()}</strong></span>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app-container">
        
        <header className="top-nav">
          <div className="logo">
            <div className="logo-icon">C</div>
            <span className="logo-text">Creativa Pro</span>
          </div>
          <div className="nav-actions">
            <span className="workspace-status">{canvasSize.w}x{canvasSize.h}px</span>
          </div>
        </header>

        <TopControlPanel />

        <div className="main-body">
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

          <section className="workspace-container">
            <div className="canvas-scroll-area" ref={canvasContainerRef}>
              <div className="canvas-shadow-wrapper">
                 <canvas ref={canvasElementRef} />
              </div>
            </div>

            {studioMode === 'video' && (
              <div className="video-timeline-dock">
                <div className="timeline-toolbar-header">
                  <div className="timeline-controls-left">
                    <button className="tb-btn primary small-btn" onClick={togglePlayback}>
                      {isPlaying ? <Pause size={12}/> : <Play size={12}/>} {isPlaying ? "Pause" : "Play"}
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
                          <span className="empty-lane-hint">Empty track</span>
                        ) : (
                          track.clips.map(clip => (
                            <div key={clip.id} className="timeline-clip-block">
                              <span>{clip.name}</span>
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
        
        {toast && <div className="toast-msg"><Check size={14} /> {toast}</div>}
      </div>
    </>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { font-family: 'Inter', sans-serif; background-color: #f1f5f9; overflow: hidden; width: 100vw; height: 100vh; position: fixed; touch-action: manipulation; }
button, select, input { font-family: inherit; }
button { border: none; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; }

.app-container { display: flex; flex-direction: column; height: 100vh; width: 100vw; position: relative; overflow: hidden; }
.custom-scrollbar::-webkit-scrollbar { height: 3px; width: 3px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

.top-nav { height: 42px; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; z-index: 55; flex-shrink: 0;}
.logo { display: flex; align-items: center; gap: 8px; }
.logo-icon { width: 22px; height: 22px; border-radius: 4px; background: #5c4dff; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px;}
.logo-text { font-size: 13px; font-weight: 700; color: #fff;}
.workspace-status { font-size: 11px; color: #94a3b8; }

.top-multi-bar { display: flex; flex-direction: column; background: #fff; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; z-index: 45; }
.top-toolbar-row { height: 38px; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; border-bottom: 1px solid #f1f5f9; gap: 6px; }
.top-toolbar-row.primary-bar-row { overflow-x: auto; white-space: nowrap; }
.top-toolbar-row.secondary-row { background: #f8fafc; overflow-x: auto; white-space: nowrap; justify-content: flex-start; }

.tb-section-group { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.tb-btn { padding: 0 8px; height: 26px; border-radius: 4px; background: #f1f5f9; border: 1px solid #e2e8f0; color: #334155; font-size: 11px; font-weight: 600; white-space: nowrap; flex-shrink: 0;}
.tb-btn:hover:not(:disabled) { background: #e2e8f0; }
.tb-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.tb-btn.active { background: #eef2ff; color: #5c4dff; border-color: #5c4dff; }
.tb-btn.primary { background: #5c4dff; color: #fff; border-color: #5c4dff; }
.tb-btn.danger-text { color: #ef4444; border-color: #fee2e2; background: #fef2f2; }
.small-btn { height: 22px; font-size: 10px; padding: 0 6px; }

.mode-switch-group { display: flex; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px; gap: 2px; }
.mode-btn { padding: 0 8px; height: 22px; border-radius: 3px; font-size: 10px; font-weight: 600; color: #475569; display: flex; align-items: center; gap: 3px; }
.mode-btn.active { background: #5c4dff; color: #fff; }

.tb-icon-btn { width: 26px; height: 26px; border-radius: 4px; background: #f1f5f9; border: 1px solid #e2e8f0; color: #475569; }
.tb-icon-btn.small { width: 18px; height: 18px; }
.tb-divider { width: 1px; height: 16px; background: #e2e8f0; flex-shrink: 0; margin: 0 2px; }
.tb-input-group { display: flex; align-items: center; gap: 4px; background: #fff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 0 6px; height: 26px; flex-shrink: 0;}
.tb-input-group label { font-size: 10px; font-weight: 600; color: #64748b; }
.tb-input-group input[type="number"] { width: 34px; border: none; background: transparent; font-size: 11px; outline: none; }
.tb-select { height: 26px; padding: 0 4px; border-radius: 4px; border: 1px solid #e2e8f0; font-size: 11px; outline: none; background: #fff; }
.tb-label { font-size: 11px; font-weight: 600; color: #64748b; margin-right: 4px; display: flex; align-items: center; gap: 3px; }

.main-body { display: flex; flex: 1; overflow: hidden; position: relative; width: 100%; height: 100%; }

.primary-toolbar { 
  width: 130px; 
  background: #fff; 
  border-right: 1px solid #e2e8f0; 
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: 48px;
  gap: 4px;
  padding: 6px; 
  z-index: 40; 
  overflow-y: auto; 
  flex-shrink: 0;
}
.sidebar-btn { 
  flex-direction: column; 
  height: 100%; 
  width: 100%; 
  border-radius: 6px; 
  color: #64748b; 
  font-size: 9px; 
  font-weight: 600; 
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  padding: 2px;
}
.sidebar-btn:hover { background: #f1f5f9; color: #0f172a; }
.sidebar-btn.active { background: #eef2ff; color: #5c4dff; border-color: #c7d2fe; }
.tool-label { margin-top: 1px; font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

.workspace-container { flex: 1; display: flex; flex-direction: column; background: #f8fafc; overflow: hidden; position: relative; min-width: 0; }
.canvas-scroll-area { flex: 1; overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative; width: 100%; height: 100%; padding: 20px; }

.canvas-shadow-wrapper { 
  background: transparent; 
  box-shadow: 0 12px 35px rgba(15, 23, 42, 0.12); 
  border-radius: 2px; 
  position: absolute; 
  top: 50%; 
  left: 50%; 
  transform: translate(-50%, -50%); 
  transform-origin: center center;
  overflow: hidden;
  contain: layout style;
}
.canvas-shadow-wrapper .canvas-container {
  width: 100% !important;
  height: 100% !important;
  position: absolute !important;
  top: 0;
  left: 0;
}
.canvas-shadow-wrapper canvas { 
  display: block; 
}

.video-timeline-dock {
  height: 130px;
  background: #1e293b;
  border-top: 1px solid #334155;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 45;
  color: #fff;
}
.timeline-toolbar-header {
  height: 32px;
  background: #0f172a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  border-bottom: 1px solid #334155;
}
.timeline-controls-left { display: flex; align-items: center; gap: 8px; }
.timecode-display { font-family: monospace; font-size: 11px; color: #38bdf8; }
.timeline-controls-right { flex: 1; max-width: 400px; margin-left: 15px; }
.timeline-global-scrubber { width: 100%; cursor: pointer; accent-color: #5c4dff; }

.timeline-tracks-container {
  flex: 1;
  overflow-y: auto;
  padding: 4px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.timeline-track-row {
  height: 26px;
  background: #0f172a;
  border-radius: 4px;
  display: flex;
  align-items: center;
  padding: 0 6px;
  gap: 8px;
  border: 1px solid #334155;
}
.track-label-badge {
  width: 100px;
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.track-clips-lane {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
}
.empty-lane-hint { font-size: 10px; color: #64748b; font-style: italic; }
.timeline-clip-block {
  background: #5c4dff;
  color: white;
  padding: 1px 8px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
  display: flex;
  align-items: center;
  height: 20px;
}

.toast-msg { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #1e293b; color: white; padding: 8px 16px; border-radius: 6px; display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; z-index: 9999; box-shadow: 0 8px 20px rgba(0,0,0,0.25); }

@media (max-width: 900px) {
  .app-container { height: 100vh; overflow: hidden; }
  .main-body { flex-direction: column; height: calc(100vh - 42px - 76px); }
  .primary-toolbar { 
    position: fixed; 
    bottom: 0; 
    left: 0; 
    width: 100%; 
    height: 64px; 
    display: flex;
    grid-template-columns: none;
    flex-direction: row; 
    overflow-x: auto; 
    border-right: none; 
    border-top: 1px solid #e2e8f0; 
    padding: 4px 8px;
    gap: 4px;
    background: #fff;
    z-index: 60;
  }
  .sidebar-btn { flex: 0 0 46px; height: 52px; border-radius: 6px; }
  .canvas-scroll-area { padding-bottom: 74px; padding-top: 24px; }
}
`;