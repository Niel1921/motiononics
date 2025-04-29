This is my thesis project for gesture controlled music

## Getting Started

Head to motiononics.com to have a go!


# Motiononics App
## Pages
### / (HomePage)
- Header  
- Links → Tutorials, Play-for-me  

### /about (AboutPage)
- Header  
- Static sections  
  - “Why Motiononics?”  
  - “How it Works”  
- Assets: gestureimg/gesturegroup.webp  

### /contact (ContactPage)
- Header  
- UI::Card + UI::Button → Contact form  

### /play-for-me (PlayForMePage)
- Header  
- Controls  
  - CircleOfFifths 🎛  
  - Genre select (Card, Button)  
  - Rhythm select (Card, Button)  
  - BPM slider  
  - Start/Stop Button  
- Visuals  
  - 3 × 3 Chord Grid (canvas)  
- Hooks  
  - useAudio 🎧  
  - useGesture ✋  
- Data ➜ chordPatterns ▸ rhythmPatterns ▸ keySignatures ▸ romanToOffset  
- Utils ➜ musicHelpers ▸ constants ▸ utils  
- Public samples 🎵 fist.wav • guitarnew.wav • impulse.wav  
- Exports  
  - jsPDF → sheet-music.pdf  
  - Audio Blob → recording.wav  

### /record (RecordPage)
- Header  
- useAudio (record mode)  
- UI::Button → “Save WAV”  

### /tutorials (index)
- Header  
- Grid of tutorial Cards  
#### /tutorials/gesture-walkthrough
- Header  
- Steps (Closed Fist → Open Palm → Thumb Up …)  
- MediaPipe (gesture recogniser)  
- useAudio → success.wav  
- Assets: gestureimg/*.png  

#### /tutorials/setup (Learn the Instruments)
- Header  
- Instrument switcher (Button group)  
- 3D Visualisers  
  - ThreePianoVisualizer 🎹  
  - ThreeGuitarVisualizer 🎸  
  - ThreeThereminVisualizer 🎻  
- CircleOfFifths  
- Hooks: useAudio • useGesture  
- Textures (public/textures/*)  

#### /tutorials/chord-modes
- Header  
- CircleOfFifths (theory mode)  
- Examples from chordPatterns  

#### /tutorials/play-for-me (Feature guide)
- Header  
- Walk-through screenshots / demo snippets  

## Components  <!-- reusable visual or logic blocks -->
### Header
### CircleOfFifths (uses keySignatures data)
### Three * Visualisers (Three.js)
- Piano • Guitar • Theremin  
### UI library  (`components/ui`)
- Card • Button • etc.  

## Hooks  (`app/hooks`)
- useAudio → Web Audio API  
- useGesture → MediaPipe + getUserMedia  
- musicUtils (helper converters)  

## Data Modules (`app/data`)
- keySignatures.ts  
- chordPatterns.ts  
- rhythmPatterns.ts  
- romanToOffset.ts  

## Utilities (`app/lib`)
- constants.ts  
- musicHelpers.ts  
- utils.ts  

## Public Assets (high-level)
- gestureimg/… (hand-pose icons)  
- instrumentimg/… (piano.png, guitar.png, theremin.png)  
- samples/… (fist.wav, guitarnew.wav, impulse.wav)  
- textures/… (wood grain, tablebg.jpg)  
