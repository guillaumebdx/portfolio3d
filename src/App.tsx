import './App.css'
import Scene from './components/Scene'
import Overlay from './components/Overlay'
import CompletionModal from './components/CompletionModal'
import Loader from './components/Loader'
import ModeSelector from './components/ModeSelector'

function App() {
  return (
    <div className="canvas-container">
      <Scene />
      <Overlay title="Portfolio" subtitle="Guillaume HARARI" />
      <CompletionModal />
      <Loader />
      <ModeSelector />
    </div>
  )
}

export default App
