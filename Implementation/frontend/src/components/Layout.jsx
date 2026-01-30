import { NavLink, Outlet } from "react-router-dom";
import "../styles/Layout.css";

export default function Layout() {
  return (
    <div className="layout">
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
            to="/reports"
            className={({ isActive }) => (isActive ? "navLink active" : "navLink")}
          >
            Reports
          </NavLink>
        </nav>

        <p className="sidebarNote">Week 4: Layout + Navigation</p>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
