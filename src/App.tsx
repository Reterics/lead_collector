import './App.css'
import Questionnaire, {type QuestionnaireSchema } from './components/Questionnaire'

const sampleSchema: QuestionnaireSchema = {
  name: 'Questionnaire',
  questions: [
    { id: '1', name: 'Név', type: 'text', description: 'Szöveges leírás' },
    { id: '2', name: 'Éhes vagy?', type: 'radio', options: ['Nem', 'Igen'] },
    { id: '3', name: 'Szeretnél sütit?', type: 'dropdown', options: ['Nem', 'Igen'] },
    { id: '4', name: 'Vélemény', type: 'textarea' },
  ],
}

function App() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
      <Questionnaire schema={sampleSchema} />
    </div>
  )
}

export default App
