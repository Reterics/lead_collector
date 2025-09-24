import {
  Routes,
  Route,
  Navigate,
  useParams,
  Link,
  useNavigate,
} from 'react-router-dom';
import Home from './pages/Home.tsx';
import Questionnaire from './pages/Questionnaire.tsx';
import QuestionnaireEditor from './pages/QuestionnaireEditor.tsx';
import SubmissionsList from './pages/SubmissionsList.tsx';
import { useQuestionnaireContext } from './context/QuestionnaireContext';
import SignInComponent from './pages/SignIn.tsx';
import AuthProvider, { AuthContext } from './context/AuthContext.tsx';
import { useContext } from 'react';
import PageLoading from './components/PageLoading.tsx';
import { FirebaseProvider } from './services/firebase.tsx';

function QuestionnaireRoute() {
  const { id } = useParams<{ id: string }>();
  const { getById } = useQuestionnaireContext();
  const navigate = useNavigate();
  const schema = id ? getById(id) : undefined;
  if (!id) return <Navigate to="/" replace />;
  if (!schema) {
    return (
      <section className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Questionnaire not found</h2>
            <Link to="/" className="text-blue-600 hover:underline">&larr; Back</Link>
          </div>
          <p className="text-gray-700 dark:text-gray-300">The requested questionnaire "{id}" does not exist.</p>
        </div>
      </section>
    );
  }
  return (
    <section className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4">
      <div className="max-w-3xl mx-auto px-4">
        <button onClick={() => navigate(-1)} className="mb-3 text-blue-600 hover:underline">&larr; Back</button>
        <Questionnaire schema={schema} />
      </div>
    </section>
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
    <AuthProvider>

          <Routes>
            <Route
              path="/"
              element={
                <AuthenticatedRoute>
                    <FirebaseProvider><Home /></FirebaseProvider>
                </AuthenticatedRoute>
              }
            />
            <Route path="/login" element={<SignInComponent />} />
            <Route
              path="/questionnaires/new"
              element={
                <AuthenticatedRoute>
                    <FirebaseProvider><QuestionnaireEditor /></FirebaseProvider>
                </AuthenticatedRoute>
              }
            />
            <Route
              path="/questionnaires/:id/edit"
              element={
                <AuthenticatedRoute>
                    <FirebaseProvider><QuestionnaireEditor /></FirebaseProvider>
                </AuthenticatedRoute>
              }
            />
            <Route
              path="/questionnaires/:id"
              element={
                <AuthenticatedRoute>
                    <FirebaseProvider><QuestionnaireRoute /></FirebaseProvider>
                </AuthenticatedRoute>
              }
            />
            <Route
              path="/submissions"
              element={
                <AuthenticatedRoute>
                    <FirebaseProvider><SubmissionsList /></FirebaseProvider>
                </AuthenticatedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
    </AuthProvider>
  );
}

export default App;
