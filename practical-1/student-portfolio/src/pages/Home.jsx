import Header from '../components/Header';
import About from '../components/About';
import Skills from '../components/Skills';

function Home() {
  const studentName   = "Pruthavi Prajapati";
  const studentRole   = "Artificial Intelligence & Machine Learning Engineer | CHARUSAT";
  const studentSkills = ["HTML", "CSS", "JavaScript", "React", "Python", "Node.js", "SQL"];

  return (
    <div className="container">
      <Header name={studentName} role={studentRole} />
      <About />
      <Skills skillList={studentSkills} />
    </div>
  );
}

export default Home;
