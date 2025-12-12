// Filepath: Melodex/melodex-front-end/src/components/Navbar.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useUserContext } from "../contexts/UserContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar,
  faSync,
  faList,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import defaultImage from "../images/default-avatar.png";

function Navbar() {
  const { userPicture, userID, loading } = useUserContext();

  // Debug: Log userPicture to confirm its value
  console.log(
    "Navbar rendering with userPicture:",
    userPicture,
    "loading:",
    loading
  );

  // Prefer a local default to avoid cross-site fetches being blocked
  // const defaultImage = "./images/default-avatar.png";
  // If a user exists and userPicture is truthy, use it; otherwise use local default
  const profileImage = userID && userPicture ? userPicture : defaultImage;

  // Helper to render the profile bubble as an <img> (allows referrerPolicy & onError fallback)
  const ProfileBubble = ({ src }) => (
    <div
      className="profile-bubble-wrapper"
      style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden" }}
    >
      <img
        src={src || defaultImage}
        alt="profile"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={(e) => {
          // local fallback if remote image is blocked or fails
          e.currentTarget.onerror = null;
          e.currentTarget.src = defaultImage;
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </div>
  );

  // Show a placeholder or nothing while loading
  if (loading) {
    return (
      <nav>
        <div className="nav-left">
          <Link to="/" className="logo">
            Melodx
          </Link>
          <div className="nav-links">
            <Link to="/rank">
              <FontAwesomeIcon icon={faStar} className="nav-icon" />{" "}
              <span>Rank</span>
            </Link>
            <Link to="/rerank">
              <FontAwesomeIcon icon={faSync} className="nav-icon" />{" "}
              <span>Re-Rank</span>
            </Link>
            <Link to="/rankings">
              <FontAwesomeIcon icon={faList} className="nav-icon" />{" "}
              <span>Rankings</span>
            </Link>
          </div>
        </div>
        <div className="nav-right">
          <Link to="/profile" className="profile-link" aria-label="Profile">
            <ProfileBubble src={defaultImage} />
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav>
      <div className="nav-left">
        <Link to="/" className="logo">
          Melodx
        </Link>
        <div className="nav-links">
          <Link to="/rank">
            <FontAwesomeIcon icon={faStar} className="nav-icon" />{" "}
            <span>Rank</span>
          </Link>
          <Link to="/rerank">
            <FontAwesomeIcon icon={faSync} className="nav-icon" />{" "}
            <span>Re-Rank</span>
          </Link>
          <Link to="/rankings">
            <FontAwesomeIcon icon={faList} className="nav-icon" />{" "}
            <span>Rankings</span>
          </Link>
        </div>
      </div>
      <div className="nav-right">
        <Link to="/profile" className="profile-link" aria-label="Profile">
          <ProfileBubble src={profileImage} />
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;
