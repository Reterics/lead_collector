import './App.css'
import Home from './components/Home'
import Questionnaire from './components/Questionnaire'
import { QuestionnaireProvider, useCurrentQuestionnaire } from './context/QuestionnaireContext'

import { useQuestionnaireContext } from './context/QuestionnaireContext'

function Inner() {
  const current = useCurrentQuestionnaire();
  const { selectById } = useQuestionnaireContext();
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
      {current ? (
        <>
          <button onClick={() => selectById(null)} style={{ marginBottom: 12 }}>&larr; Back</button>
          <Questionnaire schema={current} />
        </>
      ) : (
        <Home />
      )}
    </div>
  );
}

function App() {
  return (
    <QuestionnaireProvider>
      <Inner />
    </QuestionnaireProvider>
  )
}

export default App
