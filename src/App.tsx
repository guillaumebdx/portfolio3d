import './App.css'
import Scene from './components/Scene'
import Overlay from './components/Overlay'
import CompletionModal from './components/CompletionModal'
import Loader from './components/Loader'

function App() {
  return (
    <div className="canvas-container">
      <Scene />
      <Overlay title="Portfolio" subtitle="Guillaume HARARI" />
      <CompletionModal />
      <Loader />
    </div>
  )
}

export default App
