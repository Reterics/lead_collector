import './App.css'
import { Routes, Route, Navigate, useParams, Link, useNavigate } from 'react-router-dom'
import Home from './components/Home'
import Questionnaire from './components/Questionnaire'
import { QuestionnaireProvider, useQuestionnaireContext } from './context/QuestionnaireContext'
import SignInComponent from "./components/SignIn.tsx";
import AuthProvider, {AuthContext} from "./context/AuthContext.tsx";
import {useContext} from "react";
import PageLoading from "./components/PageLoading.tsx";

function QuestionnaireRoute() {
  const { id } = useParams<{ id: string }>();
  const { getById } = useQuestionnaireContext();
  const navigate = useNavigate();
  const schema = id ? getById(id) : undefined;
  if (!id) return <Navigate to="/" replace />;
  if (!schema) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Questionnaire not found</h2>
          <Link to="/">&larr; Back</Link>
        </div>
        <p>The requested questionnaire "{id}" does not exist.</p>
      </div>
    );
  }
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>&larr; Back</button>
      <Questionnaire schema={schema} />
    </div>
  );
}

function AuthenticatedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useContext(AuthContext);

    if (!user) return <SignInComponent />;

    if (loading) return <PageLoading />;

    return children;
}

function App() {
  return (
    <QuestionnaireProvider>
        <AuthProvider>
            <Routes>
                <Route path="/" element={<AuthenticatedRoute><Home /></AuthenticatedRoute>} />
                <Route path="/login" element={<SignInComponent />} />
                <Route path="/questionnaires/:id" element={
                    <AuthenticatedRoute><QuestionnaireRoute /></AuthenticatedRoute>
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AuthProvider>
    </QuestionnaireProvider>
  )
}

export default App
