import React from 'react';
import {useQuestionnaireContext} from '../context/QuestionnaireContext';

const Home: React.FC = () => {
  const { questionnaires, selectById } = useQuestionnaireContext();

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <h1>Choose a questionnaire</h1>
      <div style={{ display: 'grid', gap: 12 }}>
        {questionnaires.map(q => (
          <div key={q.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
            <h3 style={{ margin: '8px 0' }}>{q.name}</h3>
            {q.description && <p style={{ marginTop: 0 }}>{q.description}</p>}
            <button onClick={() => selectById(q.id)}>Start</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
