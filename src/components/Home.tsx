import React, { useContext } from 'react';
import { useQuestionnaireContext } from '../context/QuestionnaireContext';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.tsx';

const Home: React.FC = () => {
  const { questionnaires } = useQuestionnaireContext();
  const navigate = useNavigate();
  const { SignOut } = useContext(AuthContext);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1>Choose a questionnaire</h1>
        <button onClick={() => SignOut()}>Logout</button>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {questionnaires.map((q) => (
          <div
            key={q.id}
            style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}
          >
            <h3 style={{ margin: '8px 0' }}>{q.name}</h3>
            {q.description && <p style={{ marginTop: 0 }}>{q.description}</p>}
            <button onClick={() => navigate(`/questionnaires/${q.id}`)}>
              Start
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
