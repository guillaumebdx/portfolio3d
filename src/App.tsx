import './App.css'
import Scene from './components/Scene'
import Overlay from './components/Overlay'

function App() {
  return (
    <div className="canvas-container">
      <Scene />
      <Overlay title="Portfolio" subtitle="Guillaume HARARI" />
    </div>
  )
}

export default App
