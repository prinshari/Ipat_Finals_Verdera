import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Register from "./Register";
import Login from "./Login";
import Dashboard from "./Dashboard"; // Admin Dashboard
import Dashboard1 from "./Dashboard1"; // Staff Dashboard
import Dashboard3 from "./Dashboard3"; // Staff2 Dashboard
import Macairan from "./Macairan"; // Admin1
import Cervantes from "./Cervantes"; // Admin2
import Ramboyong from "./Ramboyong"; // Mayor
import VERDERA from "./VERDERA"; // Vice


function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* Role-based Dashboards */}
        <Route path="/dashboard" element={<Dashboard />} />    {/* Admin */}
        <Route path="/staff" element={<Dashboard1 />} />       {/* Staff */}
        <Route path="/staff2" element={<Dashboard3 />} />      {/* Staff2 */}
        <Route path="/admin1" element={<Macairan />} />        {/* Admin1 */}
        <Route path="/cervantes" element={<Cervantes />} />    {/* Admin2 */}
        <Route path="/mayor" element={<Ramboyong />} />        {/* Mayor */}
        <Route path="/vice" element={<VERDERA />} />           {/* Vice */}
      </Routes>
    </Router>
  );
}

export default App;
