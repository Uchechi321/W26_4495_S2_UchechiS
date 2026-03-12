import { NavLink, Outlet } from "react-router-dom";
import "../styles/Layout.css";

export default function Layout() {
  return (
    <div className="layoutContainer">
      <aside className="sidebar">
        <h2 className="sidebarTitle">Drilling Ops DSS</h2>

        <nav className="nav">
          <NavLink
            to="/wells"
            className={({ isActive }) => (isActive ? "navLink active" : "navLink")}
          >
            Wells
          </NavLink>

          <NavLink
            to="/summary-reports"
            className={({ isActive }) => (isActive ? "navLink active" : "navLink")}
          >
            Summary Reports
          </NavLink>

          <NavLink
            to="/well-locations"
            className={({ isActive }) => (isActive ? "navLink active" : "navLink")}
          >
            Well Location
          </NavLink>
        </nav>
      </aside>

      <main className="layoutContent">
        <Outlet />
      </main>
    </div>
  );
}
