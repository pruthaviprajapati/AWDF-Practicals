import Header from './components/Header';
import About from './components/About';
import Skills from './components/Skills';
import Projects from './components/Projects';
import Footer from './components/Footer';

function App() {
  const studentName = "Pruthavi Prajapati";
  const studentRole = "Artificial Intelligence & Machine Learning Engineer | CHARUSAT";
  const studentSkills = ["HTML", "CSS", "JavaScript", "React", "Python", "Node.js", "SQL"];

  return (
    <div className="container">
      <Header name={studentName} role={studentRole} />
      <About />
      <Skills skillList={studentSkills} />
      <Projects />
      <Footer />
    </div>
  );
}

export default App;



