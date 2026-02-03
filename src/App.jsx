import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Home from './Home'
import MyTree from './MyTree'


function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tree" element={<MyTree />} />
      </Routes>
    </Router>
  )
}

export default App
