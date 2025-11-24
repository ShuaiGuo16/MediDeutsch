import React from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Activity, BookOpen, MessageSquare, Menu, X, FileText, BarChart3, Layers, Trophy } from 'lucide-react';
import { Vocabulary } from './pages/Vocabulary';
import { Roleplay } from './pages/Roleplay';
import { CaseStudy } from './pages/CaseStudy';
import { CaseStudyProvider } from './context/CaseStudyContext';

// Landing Page / Dashboard Component
const Dashboard = () => {
  // Simple stats reading
  const savedCardsCount = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('savedCards');
      return saved ? JSON.parse(saved).length : 0;
    } catch { return 0; }
  }, []);

  const customScenariosCount = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('customScenarios');
      return saved ? JSON.parse(saved).length : 0;
    } catch { return 0; }
  }, []);

  const totalScore = React.useMemo(() => {
    try {
      const score = localStorage.getItem('totalScore');
      return score ? parseInt(score) : 0;
    } catch { return 0; }
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
          Master Medical German <br/>
          <span className="text-teal-600">with AI Precision</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          MediDeutsch is designed for healthcare professionals. Improve your Fachsprache, practice anamnesis, and communicate with confidence in the DACH region.
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
           <div className="bg-teal-100 text-teal-600 p-3 rounded-xl">
             <BarChart3 className="w-6 h-6" />
           </div>
           <div>
             <p className="text-2xl font-bold text-gray-900">{savedCardsCount}</p>
             <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Words</p>
           </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
           <div className="bg-amber-100 text-amber-600 p-3 rounded-xl">
             <Trophy className="w-6 h-6" />
           </div>
           <div>
             <p className="text-2xl font-bold text-gray-900">{totalScore}</p>
             <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Quiz Score</p>
           </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
           <div className="bg-indigo-100 text-indigo-600 p-3 rounded-xl">
             <Layers className="w-6 h-6" />
           </div>
           <div>
             <p className="text-2xl font-bold text-gray-900">{customScenariosCount}</p>
             <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Scenarios</p>
           </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Link to="/vocab" className="group relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm hover:shadow-xl transition-all border border-teal-50">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-teal-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600 mb-4 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Fachwortschatz</h2>
            <p className="text-gray-500 text-sm mb-4">
              Smart flashcards for Anatomy and Equipment. Complete with articles and examples.
            </p>
            <span className="text-teal-600 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
              Learn Words &rarr;
            </span>
          </div>
        </Link>

        <Link to="/roleplay" className="group relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm hover:shadow-xl transition-all border border-indigo-50">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Patient Simulations</h2>
            <p className="text-gray-500 text-sm mb-4">
              Interactive roleplay scenarios from Anamnesis to Discharge with AI.
            </p>
            <span className="text-indigo-600 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
              Start Chat &rarr;
            </span>
          </div>
        </Link>

        <Link to="/cases" className="group relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm hover:shadow-xl transition-all border border-blue-50">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Klinik-Fälle</h2>
            <p className="text-gray-500 text-sm mb-4">
              Read realistic patient cases and test your medical reasoning and terminology.
            </p>
            <span className="text-blue-600 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
              Solve Cases &rarr;
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
};

const NavLink = ({ to, icon: Icon, children }: { to: string; icon: any; children?: React.ReactNode }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
        isActive 
          ? 'bg-teal-50 text-teal-700 font-semibold' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-gray-400'}`} />
      {children}
    </Link>
  );
};

const Layout: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2">
                <div className="bg-teal-600 p-1.5 rounded-lg">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 tracking-tight">Medi<span className="text-teal-600">Deutsch</span></span>
              </Link>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-2">
              <NavLink to="/" icon={Activity}>Dashboard</NavLink>
              <NavLink to="/vocab" icon={BookOpen}>Vocabulary</NavLink>
              <NavLink to="/roleplay" icon={MessageSquare}>Roleplay</NavLink>
              <NavLink to="/cases" icon={FileText}>Klinik-Fälle</NavLink>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-600 hover:text-gray-900 p-2"
              >
                {isMobileMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 p-4 space-y-2">
            <div onClick={() => setIsMobileMenuOpen(false)}>
              <NavLink to="/" icon={Activity}>Dashboard</NavLink>
            </div>
            <div onClick={() => setIsMobileMenuOpen(false)}>
              <NavLink to="/vocab" icon={BookOpen}>Vocabulary</NavLink>
            </div>
            <div onClick={() => setIsMobileMenuOpen(false)}>
              <NavLink to="/roleplay" icon={MessageSquare}>Roleplay</NavLink>
            </div>
            <div onClick={() => setIsMobileMenuOpen(false)}>
              <NavLink to="/cases" icon={FileText}>Klinik-Fälle</NavLink>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <CaseStudyProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vocab" element={<Vocabulary />} />
            <Route path="/roleplay" element={<Roleplay />} />
            <Route path="/cases" element={<CaseStudy />} />
          </Routes>
        </Layout>
      </Router>
    </CaseStudyProvider>
  );
};

export default App;