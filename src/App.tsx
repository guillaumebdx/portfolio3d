import './App.css'
import Scene from './components/Scene'
import Overlay from './components/Overlay'
import CompletionModal from './components/CompletionModal'

function App() {
  return (
    <div className="canvas-container">
      <Scene />
      <Overlay title="Portfolio" subtitle="Guillaume HARARI" />
      <CompletionModal />
    </div>
  )
}

export default App
