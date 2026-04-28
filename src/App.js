import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import _ from "lodash"; // 🚀 ADD THIS LINE
import {
  Home,
  CreditCard,
  Car,
  User,
  DollarSign,
  Eye,
  Camera,
  Edit3,
  Save,
  Upload,
  Image,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import JsBarcode from "jsbarcode";
import SignatureCanvas from "react-signature-canvas";
import lockImg from "./assets/lock.jpg";
import carImg from "./assets/car.jpg";
import vicLogo from "./assets/vicroads.jpg";
import vicroadslogo from "./assets/b7be7c363_image.png";
import DemeritLogo from "./assets/demerit.jpg";
import PhotoOutline from "./assets/photooutline.png";
import qrcodebox from "./assets/302b6d8d2_Screenshot2025-10-23at10400pm.jpeg";
const path = require("path");

const App = () => {

  const [token, setToken] = useState(() => {
  const saved = JSON.parse(localStorage.getItem("auth"));
  return saved?.token || null;
});
const [lastRefreshed, setLastRefreshed] = useState(new Date());

useEffect(() => {
  const interval = setInterval(() => {
    setLastRefreshed(new Date());
  }, 60000); // Update every 1 minute

  return () => clearInterval(interval);
}, []);
  // 🔐 ADD AUTH STATE
  const [auth, setAuth] = useState(() => {
    return JSON.parse(localStorage.getItem("auth")) || null;
  });
const [authScreen, setAuthScreen] = useState(auth ? "done" : "login");
  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    name: "",
    key: "",
  });

  const isAdmin = auth?.role === "admin";
  // ADMIN STATE
const [loginError, setLoginError] = useState("");
const [signupError, setSignupError] = useState("");
const [loadingUserData, setLoadingUserData] = useState(false);
  

const [screen, setScreen] = useState(auth ? "pin" : "home"); 
  const [showQR, setShowQR] = useState(false);
  const [qrTimer, setQrTimer] = useState(30); // Changed to 30s
  const [showCard, setShowCard] = useState(false);
  const [tab, setTab] = useState("permit");

  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [pinIndex, setPinIndex] = useState(0);

  const sigCanvasRef = useRef();
  const [showCardNum, setShowCardNum] = useState(false);
const [showLoadingOnScroll, setShowLoadingOnScroll] = useState(false);
const [lastScrollTop, setLastScrollTop] = useState(0);
  const [userData, setUserData] = useState({
  fullName: "NAME NOT SET",
  address: "",
  dob: "",
  issueDate: "",    // ADD THIS
  expiryDate: "",   // ADD THIS
  profilePic: null,
  signature: null,
  licenceNum: "",
  cardNum: "",
});
  const fetchUserData = async (tokenParam) => {
  setLoadingUserData(true);

  try {
    const res = await apiFetch(API + "/me", {
      headers: { Authorization: `Bearer ${tokenParam || token}` },
    });
    // 🔥 HANDLE BANNED
    if (res.status === 403) {
      const errData = await res.json().catch(() => ({}));

      if (errData.error === "Account banned") {
        localStorage.removeItem("auth");
        localStorage.removeItem("userData");
        setAuth(null);
        setToken(null);
        setAuthScreen("login");
        setScreen("pin");
        return;
      }
    }

    if (!res.ok) throw new Error("Failed to fetch user data");

    const data = await res.json();

    setUserData(prev => ({
  fullName: data.name || "NAME NOT SET",
  address: data.licenceData?.address || "",
  dob: data.licenceData?.dob || "",
  issueDate: data.licenceData?.issueDate || "",     // ✅ ADD THIS
  expiryDate: data.licenceData?.expiryDate || "",   // ✅ ADD THIS
  profilePic: data.licenceData?.profilePic || null,
  signature: data.licenceData?.signature || null,
  licenceNum: data.licenceNum || prev.licenceNum || genNum(8),
  cardNum: data.cardNum || prev.cardNum || genNum(9),
}));

    // 🔥 keep role in auth
    setAuth(prev => ({
      ...prev,
      role: data.role
    }));

    localStorage.setItem("userData", JSON.stringify(data.licenceData || {}));

  } catch (e) {
    const saved = localStorage.getItem("userData");
    if (saved) setUserData(JSON.parse(saved));
  }

  setLoadingUserData(false);
};

  const [qr, setQr] = useState("");
  const [editing, setEditing] = useState(false);
  const [tempData, setTempData] = useState({});

  const API = "http://159.196.236.56:5000";
  // ✅ FIXED apiFetch - MOST IMPORTANT FIX
const apiFetch = async (url, options = {}) => {
  const controller = new AbortController(); // ✅ ALWAYS create controller
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal, // ✅ correct usage
    });

    clearTimeout(timeoutId);

    if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      if (data.error === "Account banned") {
        localStorage.clear();
        window.location.reload();
        throw new Error("Banned");
      }
    }

    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};
  

  // 🔐 ADD LOGIN / SIGNUP FUNCTIONS
  const login = async () => {
  setLoginError("");
  try {
    const res = await apiFetch(API + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authForm),
    });
    if (!res.ok) {
      const err = await res.json();
      setLoginError(err.error || "Login failed");
      return;
    }
    const data = await res.json();
    if (data.token) {
      localStorage.setItem("auth", JSON.stringify(data));
      setToken(data.token);
      setAuth(data);
      setAuthScreen("done");
      await fetchUserData(data.token);
    }
  } catch (e) {
    setLoginError("Network error");
  }
};

  const signup = async () => {
  setSignupError("");
  try {
    const res = await apiFetch(API + "/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authForm),
    });
    if (!res.ok) {
      const err = await res.json();
      setSignupError(err.error || "Signup failed");
      return;
    }
    const data = await res.json();
    if (data.token) {
      localStorage.setItem("auth", JSON.stringify(data));
      setToken(data.token);
      setAuth(data);
      setAuthScreen("done");
      await fetchUserData(data.token);
    }
  } catch (e) {
    setSignupError("Network error");
  }
};


  // 💾 LOCAL STORAGE SAVE
  useEffect(() => {
    localStorage.setItem("userData", JSON.stringify(userData));
  }, [userData]);

  useEffect(() => {
    const saved = localStorage.getItem("userData");
    if (saved) setUserData(JSON.parse(saved));
  }, []);

  // ✅ FIXED: Only refresh when NOT editing/typing
useEffect(() => {
  if (!token || editing || screen === "admin") return;

  const interval = setInterval(() => {
    fetchUserData();
  }, 50000); // 50s instead of 5s

  return () => clearInterval(interval);
}, [token, editing, screen]);

  // ---------- GENERATE ----------
  const genNum = (len) =>
    Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join("");

  const genQR = () => `VIC-${Math.random().toString(36).substring(2, 12)}`;

  useEffect(() => {
    setUserData((prev) => ({
      ...prev,
      licenceNum: genNum(8),
      cardNum: genNum(9),
    }));
    setQr(genQR());
  }, []);

  // 🔄 QR AUTO REFRESH (30s)
  useEffect(() => {
    if (!showQR) return;

    setQrTimer(30);

    const i = setInterval(() => {
      setQrTimer((t) => {
        if (t <= 1) {
          setQr(genQR());
          return 30;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(i);
  }, [showQR]);

  // ---------- BARCODE ----------
  // 1. Generate random cardNum on initial mount if missing
useEffect(() => {
  if (!userData.cardNum) {
    const randomCardNum = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
    setUserData(prev => ({ ...prev, cardNum: randomCardNum }));
  }
}, []);


  // ---------- PIN ----------
  useEffect(() => {
    if (pin.join("").length === 6) {
      setTimeout(() => setScreen("home"), 150);
    }
  }, [pin]);

  const inputPin = (n) => {
    if (pinIndex > 5) return;
    const p = [...pin];
    p[pinIndex] = n;
    setPin(p);
    if (pinIndex < 5) setPinIndex(pinIndex + 1);
  };

  const back = () => {
    const p = [...pin];
    if (p[pinIndex]) p[pinIndex] = "";
    else if (pinIndex > 0) {
      p[pinIndex - 1] = "";
      setPinIndex(pinIndex - 1);
    }
    setPin(p);
  };

  // ---------- PHOTO UPLOAD ----------
  const handlePhotoUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("photo", file);

  try {
    const res = await apiFetch(API + "/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) throw new Error("Photo upload failed");

    const data = await res.json();
    const newProfilePic = data.url;

    // ✅ FIXED PART HERE
    const updated = { ...userData, profilePic: newProfilePic };

setUserData(updated);

await apiFetch(API + "/save", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(updated),
});

  } catch (e) {
    console.error("Photo upload or save failed", e);
  }
};

  // ---------- SIGNATURE ----------
  const saveSignature = () => {
    if (sigCanvasRef.current) {
      const dataURL = sigCanvasRef.current.toDataURL("image/png", 1.0);
      setUserData((prev) => ({ ...prev, signature: dataURL }));
    }
  };

  const clearSignature = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
      setUserData((prev) => ({ ...prev, signature: null }));
    }
  };

  // ---------- SAVE SETTINGS ----------
  const saveSettings = async () => {
  setEditing(false);
  try {
    await apiFetch(API + "/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });
    setUserData((prev) => ({
      ...prev,
      licenceNum: genNum(8),
      cardNum: genNum(9),
    }));
  } catch (e) {
    console.error("Failed to save user data", e);
  }
};

  // ---------- UI COMPONENTS ----------
  const Dot = ({ f }) => (
    <div className={`w-3 h-3 rounded-full ${f ? "bg-black" : "border"}`} />
  );

  const Key = ({ n }) => (
    <button onClick={() => inputPin(n)} className="text-2xl py-3">
      {n}
    </button>
  );

  // ---------- PROFILE SCREEN ----------
  // ✅ FIXED ProfileScreen - Copy-paste this entire component
const ProfileScreen = () => {
  const [editing, setEditing] = useState(false);
  const [tempData, setTempData] = useState({});

  // ✅ FIXED: Update userData when editing is done - now includes dates
  const commitChanges = async () => {
    setEditing(false);
    setUserData({
      ...userData,
      fullName: tempData.fullName || userData.fullName,
      address: tempData.address || userData.address,
      dob: tempData.dob || userData.dob,
      issueDate: tempData.issueDate || userData.issueDate,
      expiryDate: tempData.expiryDate || userData.expiryDate,
    });

    // Save to backend
    try {
      await apiFetch(API + "/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: tempData.fullName || userData.fullName,
          address: tempData.address || userData.address,
          dob: tempData.dob || userData.dob,
          issueDate: tempData.issueDate || userData.issueDate,
          expiryDate: tempData.expiryDate || userData.expiryDate,
        }),
      });
    } catch (e) {
      console.error("Save failed:", e);
    }
  };

  return (
    <div className="bg-[#F3F4F6] min-h-screen pb-24">
      <div className="bg-white px-4 py-3 flex items-center border-b sticky top-0 z-10">
        <button 
          onClick={() => setScreen("home")}
          className="p-1 rounded-full hover:bg-gray-100 mr-2"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="22" 
            height="22" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="lucide lucide-chevron-left"
          >
            <path d="m15 18-6-6 6-6"></path>
          </svg>
        </button>
        <div className="font-semibold text-base flex-1 text-center">Profile</div>
        <div style={{ width: '30px' }}></div>
      </div>

      {!editing ? (
        // VIEW MODE - Previous design
        <div className="p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="w-[120px] h-[150px] bg-gray-200 rounded-xl flex items-center justify-center overflow-hidden shadow-md mb-4">
              {userData.profilePic ? (
                <img
                  src={userData.profilePic}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg font-semibold">
                  No photo
                </div>
              )}
            </div>
            <div className="text-2xl font-bold text-center">{userData.fullName}</div>
            <div className="text-gray-500 text-sm mt-1 text-center">
              {userData.address || "No address"}
            </div>
          </div>

          <button
            onClick={() => {
              setTempData({
  fullName: userData.fullName,
  address: userData.address,
  dob: userData.dob,
  issueDate: userData.issueDate,    // NEW
  expiryDate: userData.expiryDate,  // NEW
});
              setEditing(true);
            }}
            className="w-full bg-gradient-to-r from-[#002D62] to-[#1E40AF] text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 mb-3"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="lucide lucide-pen-line"
            >
              <path d="M12 20h9"></path>
              <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"></path>
            </svg>
            Change Personal Information
          </button>

          <button
            onClick={() => {
              localStorage.removeItem("auth");
              localStorage.removeItem("userData");
              setAuth(null);
              setToken(null);
              setUserData({
                fullName: "NAME NOT SET",
                address: "",
                dob: "",
                profilePic: null,
                signature: null,
                licenceNum: "",
                cardNum: "",
                issueDate: "",
                expiryDate: "",
              });
              setAuthScreen("login");
              setScreen("pin");
            }}
            className="w-full bg-red-500 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-red-600 transition-colors"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="lucide lucide-log-out"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" x2="9" y1="12" y2="12"></line>
            </svg>
            Log Out
          </button>

          <div className="mt-8 bg-white rounded-2xl p-5 shadow-sm">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Licence Details
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Licence No.</span>
                <span className="font-mono font-medium">{userData.licenceNum}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Card No.</span>
                <span className="font-mono font-medium">{userData.cardNum}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // EDITING FORM
        <div className="p-4 space-y-5">
          {/* Profile Photo Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Profile Photo
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-20 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
                {userData.profilePic ? (
                  <img
                    src={userData.profilePic}
                    className="w-full h-full object-cover"
                    alt="Profile"
                  />
                ) : (
                  <Image size={24} className="text-gray-500" />
                )}
              </div>
              <label className="bg-[#002D62] text-white px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-2 text-sm font-medium hover:bg-[#001F45]">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="lucide lucide-camera"
                >
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
                  <circle cx="12" cy="13" r="3"></circle>
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                Upload Photo
              </label>
            </div>
          </div>

          {/* Personal Info Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={tempData.fullName || ""}
                onChange={(e) => setTempData({ ...tempData, fullName: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002D62] focus:border-transparent outline-none text-sm"
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Address
              </label>
              <input
                type="text"
                value={tempData.address || ""}
                onChange={(e) => setTempData({ ...tempData, address: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002D62] focus:border-transparent outline-none text-sm"
                placeholder="Enter address"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Date of Birth
              </label>
              <input
                type="date"
                value={tempData.dob || ""}
                onChange={(e) => setTempData({ ...tempData, dob: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002D62] focus:border-transparent outline-none text-sm"
              />
            </div>

            {/* NEW: Issue Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Issue Date
              </label>
              <input
                type="date"
                value={tempData.issueDate || ""}
                onChange={(e) => setTempData({ ...tempData, issueDate: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002D62] focus:border-transparent outline-none text-sm"
              />
            </div>

            {/* NEW: Expiry Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Expiry Date
              </label>
              <input
                type="date"
                value={tempData.expiryDate || ""}
                onChange={(e) => setTempData({ ...tempData, expiryDate: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002D62] focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>

          {/* Signature Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Signature
            </label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden">
              <SignatureCanvas
                ref={sigCanvasRef}
                canvasProps={{
                  className: "w-full h-28",
                  style: { background: '#FAFAFA', touchAction: 'none' }
                }}
                backgroundColor="#FAFAFA"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={saveSignature}
                className="flex-1 bg-green-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-600"
              >
                Save Signature
              </button>
              <button
                onClick={clearSignature}
                className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-200"
              >
                Clear
              </button>
            </div>
            {userData.signature && (
              <div className="mt-2 text-xs text-gray-500 text-center">
                Signature saved ✓
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setEditing(false);
                setTempData({});
              }}
              className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-semibold hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={commitChanges}
              className="flex-1 bg-[#002D62] text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-[#001F45]"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="lucide lucide-save"
              >
                <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path>
                <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"></path>
                <path d="M7 3v4a1 1 0 0 0 1 1h7"></path>
              </svg>
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
const AdminScreen = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [stats, setStats] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(false);
  const [users, setUsers] = useState([]);
const [keys, setKeys] = useState([]);
const [showKeysTab, setShowKeysTab] = useState(false);
const [selectedKey, setSelectedKey] = useState(null);
const [deletingKey, setDeletingKey] = useState(null);
  
    // 🚀 ADD THESE 3 LINES HERE:
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmUser, setConfirmUser] = useState(null);

  // 🚀 END ADD ⬆️
  // ✅ FIXED: Sequential loading (no more ERR_INSUFFICIENT_RESOURCES)
   const fetchAll = useCallback(async () => {
  if (adminLoading) return;

  setAdminLoading(true);
  setLoading(true);

  const headers = { Authorization: `Bearer ${token}` };

  try {
    setLoadingUsers(true);
    const usersRes = await apiFetch(API + "/admin/users", { headers });
    const usersData = await usersRes.json().catch(() => []);
    setUsers(usersData);
    setLoadingUsers(false);

    await new Promise(r => setTimeout(r, 300));

    setLoadingKeys(true);
    const keysRes = await apiFetch(API + "/admin/keys", { headers });
    const keysData = await keysRes.json().catch(() => []);
    setKeys(keysData);
    setLoadingKeys(false);

    await new Promise(r => setTimeout(r, 300));

    setLoadingStats(true);
    const statsRes = await apiFetch(API + "/admin/stats", { headers });
    const statsData = await statsRes.json().catch(() => ({}));
    setStats(statsData);
    setLoadingStats(false);

  } catch (err) {
    console.error("❌ Admin fetch failed:", err);
  } finally {
    setAdminLoading(false);
    setLoading(false);
  }
}, [token]);

  // ✅ FIXED useEffect - No more infinite loop!
  // ✅ BULLETPROOF FIX - No flickering, no spam
const handleRefresh = useCallback(() => {
  if (!adminLoading) {
    fetchAll();
  }
}, [adminLoading, fetchAll]);

useEffect(() => {
  if (!isAdmin || !token || screen !== "admin") return;
  if (adminLoading) return;

  fetchAll();
}, [token, screen, isAdmin, fetchAll]);
  // ✅ Rest of handlers stay the same...
  const showConfirmDialog = (action, user) => {
    setConfirmAction(action);
    setConfirmUser(user);
    setShowConfirm(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmUser || !confirmAction || !token) {
      setShowConfirm(false);
      return;
    }
    
    try {
      const endpoint = confirmAction === 'ban' ? '/admin/ban' : '/admin/delete-user';
      const body = confirmAction === 'ban' 
        ? { userId: confirmUser.id, banned: !confirmUser.banned }
        : { userId: confirmUser.id };

      const res = await apiFetch(API + endpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        fetchAll();
        setShowConfirm(false);
        alert(`✅ Action completed!`);
      }
    } catch (error) {
      alert("❌ Action failed");
    }
  };

  const viewUserDetails = useCallback(async (user) => {
  setLoadingDetails(true);
  setSelectedUser(user);
  setUserDetails(null);

  try {
    const loginsRes = await apiFetch(`${API}/admin/user/${user.id}/logins`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const logins = await loginsRes.json().catch(() => []);

    // 🔥 Add geolocation
    const loginsWithGeo = await Promise.all(
      logins.slice(0, 10).map(async (login) => {
        try {
          const geoRes = await apiFetch(`${API}/geolocate/${login.ip}`);
          const geo = await geoRes.json();
          return { ...login, geo };
        } catch {
          return { ...login, geo: { city: "Unknown", country: "Unknown" } };
        }
      })
    );

    setUserDetails({
      ...user,
      logins: loginsWithGeo,
      loginCount: logins.length
    });

  } catch (error) {
    console.error("Details failed:", error);
  } finally {
    setLoadingDetails(false);
  }
}, [token, API]);

const deleteKey = async (key) => {
  try {
    const res = await apiFetch(API + "/admin/key/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ key }),
    });

    if (res.ok) {
      fetchAll();
      setDeletingKey(null);
      alert("✅ Key deleted!");
    }
  } catch {
    alert("❌ Failed to delete key");
  }
};
const addKeys = async () => {
  try {
    const res = await apiFetch(API + "/admin/key/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ count: 10 }),
    });

    if (res.ok) {
      fetchAll();
      alert("✅ 10 keys created!");
    }
  } catch {
    alert("❌ Failed to create keys");
  }
};

   const filteredUsers = useMemo(() => {
    return (users || []).filter(u => {
      if (!u?.email) return false;
      const matchSearch = u.email.toLowerCase().includes(search.toLowerCase());
      switch(filter) {
        case "banned": return matchSearch && u.banned;
        case "active": return matchSearch && !u.banned;
        case "admin": return matchSearch && u.role === "admin";
        default: return matchSearch;
      }
    });
  }, [users, search, filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-[#F3F4F6]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002D62] mx-auto mb-4" />
          <p>Loading admin panel...</p>
          <p className="text-sm text-gray-500 mt-2">1/3 Users → 2/3 Keys → 3/3 Stats</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 bg-[#F3F4F6] min-h-screen pb-24">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">
          {showKeysTab ? "🔑 Keys Management" : "Admin Panel"}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowKeysTab(!showKeysTab)}
            className="px-3 py-1 bg-gray-200 text-sm rounded-full hover:bg-gray-300"
          >
            {showKeysTab ? "👥 Users" : "🔑 Keys"}
          </button>
          <button 
            onClick={handleRefresh}
            disabled={adminLoading}
            className="bg-[#002D62] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#001F45]"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-xl shadow flex items-center gap-2">
          {loadingUsers ? "⏳" : "👥"} Users: 
          <span className="font-bold text-lg">{stats.totalUsers || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow flex items-center gap-2">
          {loadingStats ? "⏳" : "✅"} Active: 
          <span className="font-bold text-lg">{stats.active || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow flex items-center gap-2">
          {loadingUsers ? "⏳" : "🚫"} Banned: 
          <span className="font-bold text-lg">{stats.banned || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow flex items-center gap-2">
          {loadingKeys ? "⏳" : "🔑"} Keys Free: 
          <span className="font-bold text-lg">{stats.keysFree || 0}</span>
        </div>
      </div>

      {/* Keys Tab */}
      {showKeysTab ? (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Keys ({keys.length})</h3>
              <button
                onClick={addKeys}
                className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600"
              >
                + Add 10 Keys
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {keys.map(k => (
                <div key={k.key} className="flex justify-between p-3 bg-gray-50 rounded">
                  <div className="flex gap-3 items-center">
                    <span className="font-mono">{k.key}</span>
                    <span className={k.used ? "text-red-500" : "text-green-500"}>
                      {k.used ? "USED" : "FREE"}
                    </span>
                  </div>
                  {!k.used && (
                    <button
                      onClick={() => deleteKey(k.key)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Users Tab */
        <div className="space-y-3">
          <div className="text-lg font-bold flex justify-between">
            <span>👥 Users ({filteredUsers.length})</span>
            <span className="text-sm text-gray-500">Total: {users.length}</span>
          </div>
          
          {filteredUsers.length === 0 ? (
            <div className="bg-white p-8 rounded-xl text-center text-gray-500">
              {users.length === 0 ? "No users yet - create some!" : "No users match your filter"}
            </div>
          ) : (
            filteredUsers.map(u => (
              <div key={u.id} className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="font-bold text-lg">{u.email}</div>
                    <div className="text-sm text-gray-500">
                      👤 {u.name || "No name"} • {u.role || "user"} • {u.id?.slice(0, 8)}...
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    u.banned ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                  }`}>
                    {u.banned ? "🚫 BANNED" : "✅ ACTIVE"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => viewUserDetails(u)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600"
                  >
                    👁️ Details
                  </button>
                  <button
                    onClick={() => showConfirmDialog('ban', u)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      u.banned ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                    }`}
                  >
                    {u.banned ? "✅ Unban" : "🚫 Ban"}
                  </button>
                  <button className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600">
                    🚪 Logout
                  </button>
                  <button className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-600">
                    🔑 Reset PW
                  </button>
                  <button
                    onClick={() => showConfirmDialog('delete', u)}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirm && confirmUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-center">
              {confirmAction === 'delete' ? '🗑️ Delete User' : '🚨 Ban/Unban'}
            </h3>
            <p className="text-gray-600 mb-6 text-center">
              {confirmAction === 'delete' 
                ? `"${confirmUser.email}" will be permanently deleted.` 
                : confirmUser.banned ? `Unban "${confirmUser.email}"?` : `Ban "${confirmUser.email}"?`
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmAction}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-gray-200 py-3 rounded-xl font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl max-h-[90vh] w-full overflow-y-auto shadow-2xl">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">{selectedUser.email}</h3>
                  <div className="text-sm text-gray-500">ID: {selectedUser.id}</div>
                </div>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setUserDetails(null);
                  }}
                  className="text-2xl font-bold hover:bg-gray-100 p-2 rounded-full"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              {loadingDetails ? (
                <div className="text-center py-12">⏳ Loading details...</div>
              ) : userDetails ? (
                <div className="space-y-4">
                  <div>Status: {userDetails.banned ? "🚫 BANNED" : "✅ ACTIVE"}</div>
                  <div>Total Logins: {userDetails.loginCount || 0}</div>
                  {userDetails.logins?.length > 0 && (
                    <div>
                      <h4 className="font-bold mb-2">Recent Logins:</h4>
                      <div className="space-y-2 max-h-40 overflow-auto">
                        {userDetails.logins.map((login, i) => (
                          <div key={i} className="text-sm p-2 bg-gray-50 rounded">
                            {new Date(login.createdAt).toLocaleString()} - {login.ip}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">No details available</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// ---------- VEHICLES SCREEN ----------
const VehiclesScreen = () => {
  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10 flex items-center">
        <button 
          onClick={() => setScreen("home")}
          className="p-1 rounded-full hover:bg-gray-100 mr-2"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="22" 
            height="22" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="lucide lucide-chevron-left"
          >
            <path d="m15 18-6-6 6-6"></path>
          </svg>
        </button>
        <h1 className="text-center text-lg font-semibold text-gray-900 flex-1">Vehicles</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* My registered vehicles */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button className="w-full" onClick={() => alert("View all registered vehicles")}>
            <div className="px-5 py-4 flex items-center justify-between active:bg-gray-50">
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">My registered vehicles</h3>
                <p className="text-sm text-gray-500 mt-1">View all registered vehicles</p>
              </div>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="lucide lucide-external-link w-5 h-5 text-gray-400 ml-3"
              >
                <path d="M15 3h6v6"></path>
                <path d="M10 14 21 3"></path>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              </svg>
            </div>
          </button>
        </div>

        {/* Manage registration renewal */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" onClick={() => alert("Renew your registration")}>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Manage registration renewal</h3>
              <p className="text-sm text-gray-500 mt-1">Renew your registration when it's due</p>
            </div>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="lucide lucide-external-link w-5 h-5 text-gray-400 ml-3"
            >
              <path d="M15 3h6v6"></path>
              <path d="M10 14 21 3"></path>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            </svg>
          </div>
        </div>

        {/* Change your garage address */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" onClick={() => alert("Change garage address")}>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Change your garage address</h3>
            </div>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="lucide lucide-external-link w-5 h-5 text-gray-400 ml-3"
            >
              <path d="M15 3h6v6"></path>
              <path d="M10 14 21 3"></path>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            </svg>
          </div>
        </div>

        {/* Apprentice registration discount */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" onClick={() => alert("Apprentice registration discount")}>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Apprentice registration discount</h3>
            </div>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="lucide lucide-external-link w-5 h-5 text-gray-400 ml-3"
            >
              <path d="M15 3h6v6"></path>
              <path d="M10 14 21 3"></path>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            </svg>
          </div>
        </div>

        {/* Unregistered vehicle permits */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" onClick={() => alert("Unregistered vehicle permits")}>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Unregistered vehicle permits</h3>
            </div>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="lucide lucide-external-link w-5 h-5 text-gray-400 ml-3"
            >
              <path d="M15 3h6v6"></path>
              <path d="M10 14 21 3"></path>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            </svg>
          </div>
        </div>

        {/* My vehicle reports */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" onClick={() => alert("View vehicle reports")}>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">My vehicle reports</h3>
            </div>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="lucide lucide-external-link w-5 h-5 text-gray-400 ml-3"
            >
              <path d="M15 3h6v6"></path>
              <path d="M10 14 21 3"></path>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
// ---------- PAYMENTS SCREEN ----------
const PaymentsScreen = () => {
  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10 flex items-center">
        <button 
          onClick={() => setScreen("home")}
          className="p-1 rounded-full hover:bg-gray-100 mr-2"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="22" 
            height="22" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="lucide lucide-chevron-left"
          >
            <path d="m15 18-6-6 6-6"></path>
          </svg>
        </button>
        <h1 className="text-center text-lg font-semibold text-gray-900 flex-1">Payments</h1>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Manage payment methods */}
          <div 
            className="px-5 py-4 flex items-center justify-between border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50" 
            onClick={() => alert("Manage payment methods")}
          >
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Manage payment methods</h3>
              <p className="text-sm text-gray-500 mt-1">Store your credit card and bank account details to make payments</p>
            </div>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="lucide lucide-external-link w-5 h-5 text-gray-400 ml-3"
            >
              <path d="M15 3h6v6"></path>
              <path d="M10 14 21 3"></path>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            </svg>
          </div>

          {/* Direct debit payments */}
          <div 
            className="px-5 py-4 flex items-center justify-between border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50" 
            onClick={() => alert("Manage direct debit settings")}
          >
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Direct debit payments</h3>
              <p className="text-sm text-gray-500 mt-1">Manage direct debit settings</p>
            </div>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="lucide lucide-external-link w-5 h-5 text-gray-400 ml-3"
            >
              <path d="M15 3h6v6"></path>
              <path d="M10 14 21 3"></path>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            </svg>
          </div>

          {/* Transaction history */}
          <div 
            className="px-5 py-4 flex items-center justify-between border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50" 
            onClick={() => alert("View transaction history")}
          >
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Transaction history</h3>
              <p className="text-sm text-gray-500 mt-1">View recent transactions made using your myVicRoads account</p>
            </div>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="lucide lucide-external-link w-5 h-5 text-gray-400 ml-3"
            >
              <path d="M15 3h6v6"></path>
              <path d="M10 14 21 3"></path>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailsScreen = () => {
  const localBarcodeRef = useRef(null);

  useEffect(() => {
    if (!localBarcodeRef.current || !userData.cardNum) return;

    try {
      JsBarcode(localBarcodeRef.current, userData.cardNum, {
        format: "CODE128",
        displayValue: false,
        height: 60,
        width: 2,
        margin: 0,
      });
    } catch (e) {
      console.error("Barcode error:", e);
    }
  }, [userData.cardNum, tab]);

  return (
    <div className="bg-white min-h-screen pb-24 max-w-screen-sm mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center z-50">
        <button onClick={() => setScreen("home")} className="p-1 -ml-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left w-6 h-6 text-gray-900">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold text-gray-900 pr-7">View details</h1>
      </div>

      {/* Last refreshed */}
      <div className="px-4 py-2 relative z-0">
        <p className="text-xs text-gray-500 text-center">
          Last refreshed: {lastRefreshed.toLocaleString("en-US", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </p>
      </div>

      {/* Red header */}
      <div className="bg-[#DE3424] px-5 py-4 flex items-center justify-between relative z-0">
        <div>
          <div className="text-sm font-bold text-white">PROBATIONARY DRIVER LICENCE</div>
          <div className="text-xs text-white">Victoria Australia</div>
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <img src={vicroadslogo} alt="VicRoads" className="h-20 brightness-0 invert" />
        </div>
      </div>

      {/* Edge-to-Edge Image Section */}
      <div className="relative px-0 py-0 z-0">
        <img
          src={PhotoOutline}
          alt="License background"
          className="w-full h-auto"
          draggable={false}
          loading="lazy"
        />
        <div className="absolute inset-0 px-[1.2rem] py-[0.95rem] flex gap-[0.9rem] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]">
          {/* Photo Box */}
          <div className="w-[48%] aspect-[3/4] overflow-hidden flex-shrink-0 rounded-[5px] relative">
            {userData.profilePic ? (
              <img
                src={userData.profilePic}
                alt="Profile"
                className="w-full h-full object-cover rounded-[5px]"
                draggable={false}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-200">
                No photo
              </div>
            )}
          </div>

          {/* QR Container */}
          <div className="flex-1 aspect-[3/4] relative z-20 overflow-hidden rounded-[5px]">
            <img
              src={qrcodebox}
              alt="QR Code consent"
              className="w-full h-full object-cover"
              draggable={false}
              loading="lazy"
            />
            <button
              type="button"
              onClick={() => setShowQR(true)}
              className="bg-transparent mx-4 my-3 absolute bottom-0 left-0 right-0 h-10 cursor-pointer"
              aria-label="Reveal QR code"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-4 bg-white">
        <div className="flex gap-2 border border-gray-300 rounded-full p-0">
          {["permit", "identity", "age"].map((tabName) => {
            const isActive = tab === tabName;
            return (
              <button
                key={tabName}
                type="button"
                onClick={() => setTab(tabName)}
                className={`flex-1 py-1.5 text-sm font-bold transition-all rounded-full ${
                  isActive
                    ? "text-white bg-[#2D3E50] shadow-sm"
                    : "text-[#6B7280] bg-transparent"
                }`}
              >
                {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-6">
        {tab === "permit" && (
          <div className="space-y-6">
            {/* Name */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{userData.fullName || "NAME NOT SET"}</h2>
              <div className="w-full h-[1px] bg-gray-300 mb-6" />
            </div>

            {/* Grid - UPDATED WITH ISSUE/EXPIRY DATES */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Permit number</p>
                <p className="font-semibold text-gray-900">{userData.licenceNum || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Expiry</p>
                {/* ✅ UPDATED: Now shows userData.expiryDate */}
                <p className="font-semibold text-gray-900">{userData.expiryDate ? new Date(userData.expiryDate).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Permit type</p>
                <p className="font-semibold text-gray-900 flex items-center gap-1">
                  Car <span className="bg-[#DE3424] text-white px-1.5 py-0.5 text-xs font-bold inline-block">P</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Date of birth</p>
                <p className="font-semibold text-gray-900">{userData.dob ? new Date(userData.dob).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "—"}</p>
              </div>
            </div>

            <div className="w-full h-[1px] bg-gray-300 mb-6" />

            {/* Address */}
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">Address</p>
              <p className="font-semibold text-gray-900">{userData.address || "—"}</p>
            </div>

            <div className="w-full h-[1px] bg-gray-300 mb-3" />

            {/* Signature */}
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-2">Signature</p>
              {userData.signature ? (
                <img src={userData.signature} alt="Signature" className="h-16 w-auto object-contain" />
              ) : (
                <div className="h-16 flex items-center text-gray-400 text-sm italic">
                  No signature available
                </div>
              )}
            </div>

            {/* Car learner permit details section - UPDATED WITH ISSUE DATE */}
            <div className="relative -mx-5 bg-[#E8EAF0] px-5 py-2">
              <h3 className="text-sm font-semibold text-[#5B6B7C] mb-1">Car learner permit details</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[#6B7280] mb-1">Permit status</p>
                <p className="text-base font-semibold text-[#5B6B7C] flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="9" fill="#52B848" />
                    <path d="M6 10 L9 13 L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                  Current
                </p>
              </div>
              <div>
                <p className="text-sm text-[#6B7280] mb-1">Proficiency</p>
                <p className="text-base font-semibold text-[#5B6B7C] flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 bg-[#DE3424] text-white font-bold text-base">P</span>
                  Probationary
                </p>
              </div>
              {/* ✅ UPDATED: Now shows userData.issueDate */}
              <div>
                <p className="text-sm text-[#6B7280] mb-1">Issue date</p>
                <p className="text-base font-semibold text-[#5B6B7C]">
                  {userData.issueDate ? new Date(userData.issueDate).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#6B7280] mb-1">Expiry</p>
                {/* ✅ UPDATED: Now shows userData.expiryDate */}
                <p className="text-base font-semibold text-[#5B6B7C]">
                  {userData.expiryDate ? new Date(userData.expiryDate).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "—"}
                </p>
              </div>
            </div>

            {/* Other details section */}
            <div className="relative -mx-5 bg-[#E8EAF0] px-5 py-2">
              <h3 className="text-sm font-semibold text-[#5B6B7C] mb-1">Other details</h3>
            </div>
            <div className="space-y-4">
              {/* Card number */}
              <div>
                <p className="text-sm text-[#6B7280] mb-2">Card number</p>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-lg text-[#5B6B7C] tracking-wide">
                    {showCardNum ? (userData.cardNum || "*******") : "*".repeat(userData.cardNum?.length || 7)}
                  </p>
                  <button
                    onClick={() => setShowCardNum((prev) => !prev)}
                    type="button"
                    className="p-1"
                    aria-label={showCardNum ? "Hide card number" : "Show card number"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye w-5 h-5 text-gray-500">
                      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="w-full h-[1px] bg-gray-300 mb-3" />

              {/* Barcode */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Victoria Police barcode</p>
                <div className="bg-white p-3 rounded flex items-center justify-between border border-gray-200">
                  <svg ref={localBarcodeRef} className="flex-1 h-16 object-contain" aria-label="Barcode" />
                  <button disabled className="p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-maximize2 w-5 h-5 text-gray-600">
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" x2="14" y1="3" y2="10" />
                      <line x1="3" x2="10" y1="21" y2="14" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "identity" && (
          <div className="space-y-6">
            {/* Name */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{userData.fullName || "NAME NOT SET"}</h2>
            </div>

            {/* Address */}
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">Address</p>
              <p className="font-semibold text-gray-900">{userData.address || "—"}</p>
            </div>

            {/* Signature */}
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-2">Signature</p>
              {userData.signature ? (
                <img src={userData.signature} alt="Signature" className="h-16 w-auto object-contain" />
              ) : (
                <div className="h-16 flex items-center text-gray-400 text-sm italic">
                  No signature available
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "age" && (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-500 mb-3">Age status</p>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#52B848] flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path 
                      d="M6 10 L9 13 L14 7" 
                      stroke="white" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-900">Over 18</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
return (
  <>

      {/* 🔐 AUTH SCREEN - BEFORE PIN */}
      {authScreen !== "done" ? (
        <div className="h-screen flex flex-col justify-center px-6">
          <div className="text-2xl font-bold mb-6 text-center">
            {authScreen === "login" ? "Login" : "Create Account"}
          </div>

          {authScreen === "signup" && (
            <>
              <input
                placeholder="Full Name"
                value={authForm.name}
                onChange={(e) =>
                  setAuthForm((p) => ({ ...p, name: e.target.value }))
                }
                className="mb-3 p-3 border rounded"
              />
              <input
                placeholder="Access Key"
                value={authForm.key}
                onChange={(e) =>
                  setAuthForm((p) => ({ ...p, key: e.target.value }))
                }
                className="mb-3 p-3 border rounded"
              />
            </>
          )}

          <input
            placeholder="Email"
            value={authForm.email}
            onChange={(e) =>
              setAuthForm((p) => ({ ...p, email: e.target.value }))
            }
            className="mb-3 p-3 border rounded"
          />

          <input
            type="password"
            placeholder="Password"
            value={authForm.password}
            onChange={(e) =>
              setAuthForm((p) => ({ ...p, password: e.target.value }))
            }
            className="mb-6 p-3 border rounded"
          /> 
{/* ✅ ADD THIS HERE */}
{authScreen === "login" && loginError && (
  <div className="text-red-600 text-sm mb-2">{loginError}</div>
)}

{authScreen === "signup" && signupError && (
  <div className="text-red-600 text-sm mb-2">{signupError}</div>
)}
          <button
            onClick={authScreen === "login" ? login : signup}
            className="bg-black text-white py-3 rounded mb-3"
          >
            {authScreen === "login" ? "Login" : "Create"}
          </button>

          <button
            onClick={() =>
              setAuthScreen(authScreen === "login" ? "signup" : "login")
            }
            className="text-sm text-gray-500"
          >
            {authScreen === "login"
              ? "Create account"
              : "Already have account?"}
          </button>
        </div>
      ) : (
        <>
          {/* PIN SCREEN */}
          {/* PIN SCREEN - EXACT MATCH */}
{screen === "pin" && (
  <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 select-none">
    {/* Lock Image */}
    <div className="mb-6">
      <img
        src={lockImg}
        alt="Lock"
        className="w-24 h-30 object-contain"
        draggable={false}
        aria-hidden="true"
      />
    </div>

    {/* Title */}
    <h1 className="text-gray-900 mb-8 text-lg font-extrabold text-center normal-case">
      Please enter your existing PIN code
    </h1>

    {/* PIN Dots */}
    <div className="flex gap-6 mb-16">
      {pin.map((_, idx) => {
        const filledCount = pin.filter(d => d !== "").length;
        const filled = idx < filledCount;
        return (
          <div
            key={idx}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              filled ? "bg-gray-900 border-gray-900" : "border-gray-300"
            }`}
            aria-hidden="true"
          />
        );
      })}
    </div>

    {/* Keypad */}
    <div className="w-full max-w-xs space-y-3">
      {/* Numbers 1-9 */}
      <div className="grid grid-cols-3 gap-x-16 gap-y-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => inputPin(n)}
            type="button"
            className="h-14 flex items-center justify-center text-2xl font-normal text-gray-900 active:bg-gray-100 rounded-full transition-colors focus:outline-none"
            aria-label={`Input number ${n}`}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Bottom row: Forgot?, 0, Delete */}
      <div className="grid grid-cols-3 gap-x-16">
        {/* Forgot? */}
        <button
          type="button"
          disabled
          className="h-14 flex items-center justify-center text-sm text-gray-900 active:bg-gray-100 rounded-full transition-colors font-normal opacity-50 cursor-not-allowed"
          aria-hidden="true"
        >
          Forgot?
        </button>

        {/* 0 */}
        <button
          onClick={() => inputPin(0)}
          type="button"
          className="h-14 flex items-center justify-center text-2xl font-normal text-gray-900 active:bg-gray-100 rounded-full transition-colors focus:outline-none"
          aria-label="Input number 0"
        >
          0
        </button>

        {/* Delete/Backspace */}
        <button
          onClick={back}
          type="button"
          className="h-14 flex items-center justify-center active:bg-gray-100 rounded-full transition-colors focus:outline-none"
          aria-label="Backspace"
        >
          <img
            src={lockImg} // Use lockImg or replace with actual delete icon
            alt="Delete"
            className="w-12 h-12 translate-y-[1px] object-contain"
            draggable={false}
          />
        </button>
      </div>
    </div>
  </div>
)}

          {/* HOME */}
          {/* HOME */}
{screen === "home" && (
  <div
    className="min-h-screen pt-8 px-6 pb-40 flex flex-col relative select-none max-w-md mx-auto"
    style={{ backgroundColor: "#EEF2F3" }}
  >
    {/* Header */}
    <h1 className="text-[#273847] font-bold text-4xl leading-[44px] mb-8 select-text">
      Hi {userData.fullName?.split(" ")[0] || "User"}
    </h1>

    {/* Cards container */}
    <div className="flex flex-col space-y-5">
      {/* Demerit points balance card */}
      <button
        onClick={() => alert("Demerit points details")}
        type="button"
        className="bg-white rounded-xl shadow py-5 px-6 select-none cursor-pointer max-w-md"
        aria-label="Demerit points balance"
        style={{ minHeight: "72px", textAlign: "left" }}
      >
        <div className="flex flex-col items-start">
          <img
            src={DemeritLogo}
            alt="Demerit icon"
            className="w-12 h-12 object-contain mb-1 select-none"
            draggable={false}
            loading="lazy"
          />
          <span className="text-[#182844] font-semibold text-base leading-6 select-none">
            Demerit points balance
          </span>
        </div>
      </button>

      {/* Registered vehicles card */}
      <button
        onClick={() => alert("Registered vehicles details")}
        type="button"
        className="bg-white rounded-xl shadow py-5 px-6 select-none cursor-pointer max-w-md"
        aria-label="Registered vehicles"
        style={{ minHeight: "72px", textAlign: "left" }}
      >
        <div className="flex flex-col items-start">
          <img
            src={carImg}
            alt="Car icon"
            className="w-12 h-12 object-contain mb-1 select-none"
            draggable={false}
            loading="lazy"
          />
          <span className="text-[#182844] font-semibold text-base leading-6 select-none">
            Registered vehicles
          </span>
        </div>
      </button>
    </div>

    {/* Admin Panel button - keep unchanged */}
    {isAdmin && (
      <button
        onClick={() => setScreen("admin")}
        className="mt-8 bg-black text-white w-full rounded-xl py-3 font-semibold select-none max-w-md mx-auto"
        aria-label="Admin Panel"
        type="button"
      >
        Admin Panel
      </button>
    )}

    {/* Licence card fixed at bottom - unchanged */}
    <div
      onClick={() => setScreen("details")}
      role="button"
      tabIndex={0}
      aria-label="View my licence details"
      onKeyPress={(e) => (e.key === "Enter" || e.key === " ") && setScreen("details")}
      className="fixed bottom-20 left-4 right-4 max-w-md mx-auto rounded-t-2xl rounded-b-none px-6 py-6 bg-gradient-to-r from-[#182844] to-[#3B5F84] cursor-pointer shadow-lg select-none"
    >
      <div className="text-lg font-semibold leading-tight text-white">My licence</div>
      <div className="opacity-90 text-sm leading-relaxed mt-1 text-white">Tap to view licence</div>

      {/* Expand icon top-right */}
      <svg
        className="absolute top-6 right-6"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M15 3h6v6" />
        <path d="M9 21H3v-6" />
        <path d="M21 3L14 10" />
        <path d="M3 21L10 14" />
      </svg>
    </div>
  </div>
)}

{screen !== "pin" && screen !== "details" && (
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3 px-4 select-none z-50">
    {/* Home */}
    <button
      type="button"
      aria-current={screen === "home" ? "page" : undefined}
      onClick={() => setScreen("home")}
      className={`flex flex-col items-center gap-1 px-4 py-1 rounded-full transition ${
        screen === "home" ? "bg-[#E1F5E6]" : "opacity-70 hover:opacity-100"
      }`}
    >
      <img
        src={vicLogo}
        alt="Home"
        className={`w-7 h-7 object-contain select-none ${
          screen === "home" ? "opacity-100" : "opacity-60"
        }`}
      />
      <span
        className={`text-xs font-semibold ${
          screen === "home" ? "text-[#3B9747]" : "text-gray-600"
        }`}
      >
        Home
      </span>
    </button>

    {/* Vehicles */}
    <button
      type="button"
      onClick={() => setScreen("vehicles")}
      className={`flex flex-col items-center gap-1 px-4 py-1 rounded-full transition ${
        screen === "vehicles" ? "bg-[#E1F5E6]" : "opacity-70 hover:opacity-100"
      }`}
    >
      <img
        src={carImg}
        alt="Vehicles"
        className={`w-7 h-7 object-contain select-none ${
          screen === "vehicles" ? "opacity-100" : "opacity-60"
        }`}
      />
      <span
        className={`text-xs font-semibold ${
          screen === "vehicles" ? "text-[#3B9747]" : "text-gray-600"
        }`}
      >
        Vehicles
      </span>
    </button>

    {/* Licence */}
    <button
      type="button"
      onClick={() => setScreen("details")}
      className={`flex flex-col items-center gap-1 px-4 py-1 rounded-full transition ${
        screen === "details" ? "bg-[#E1F5E6]" : "opacity-70 hover:opacity-100"
      }`}
    >
      <CreditCard
        size={20}
        className={screen === "details" ? "text-[#3B9747]" : "text-gray-600"}
        aria-hidden="true"
      />
      <span
        className={`text-xs font-semibold ${
          screen === "details" ? "text-[#3B9747]" : "text-gray-600"
        }`}
      >
        Licence
      </span>
    </button>

    {/* Payments */}
    <button
      type="button"
      onClick={() => setScreen("payments")}
      className={`flex flex-col items-center gap-1 px-4 py-1 rounded-full transition ${
        screen === "payments" ? "bg-[#E1F5E6]" : "opacity-70 hover:opacity-100"
      }`}
    >
      <DollarSign
        size={20}
        className={screen === "payments" ? "text-[#3B9747]" : "text-gray-600"}
        aria-hidden="true"
      />
      <span
        className={`text-xs font-semibold ${
          screen === "payments" ? "text-[#3B9747]" : "text-gray-600"
        }`}
      >
        Payments
      </span>
    </button>

    {/* Profile */}
    <button
      type="button"
      onClick={() => setScreen("profile")}
      className={`flex flex-col items-center gap-1 px-4 py-1 rounded-full transition ${
        screen === "profile" ? "bg-[#E1F5E6]" : "opacity-70 hover:opacity-100"
      }`}
    >
      <User
        size={20}
        className={screen === "profile" ? "text-[#3B9747]" : "text-gray-600"}
        aria-hidden="true"
      />
      <span
        className={`text-xs font-semibold ${
          screen === "profile" ? "text-[#3B9747]" : "text-gray-600"
        }`}
      >
        Profile
      </span>
    </button>
  </nav>
)}

          {/* PROFILE */}
          {screen === "profile" && <ProfileScreen />}
          {/* VEHICLES */}
{screen === "vehicles" && <VehiclesScreen />}

{/* DETAILS */}
{screen === "details" && <DetailsScreen />}

{screen === "payments" && <PaymentsScreen />}


          {/* DETAILS */}
          {screen === "admin" && <AdminScreen />}

          {/* SINGLE QR MODAL - KEEP THIS ONE */}
{showQR && (
  <div className="fixed inset-0 z-50 bg-white p-6 flex flex-col max-w-md mx-auto my-16 rounded-lg shadow-lg overflow-auto">
    {/* Header */}
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-xl font-bold select-none">Verify Licence</h2>
      <button
        onClick={() => setShowQR(false)}
        className="text-base font-medium hover:underline select-none"
        type="button"
      >
        Close
      </button>
    </div>

    {/* QR Code */}
    <div className="flex justify-center mb-6">
      <QRCodeSVG value={qr} size={280} bgColor="#fff" fgColor="#000" />
    </div>

    {/* QR Expiration Timer */}
    <div className="text-center font-semibold text-base mb-6 select-none">
      QR expires {Math.floor(qrTimer / 60).toString().padStart(2, "0")}:
      {(qrTimer % 60).toString().padStart(2, "0")}
    </div>

    {/* Description Text */}
    <div className="text-gray-900 text-sm leading-relaxed mb-6">
      <p>
        By presenting this QR code you <strong>consent</strong> to share some or all of your driver licence
        information, including with scanners, venues and law enforcement agencies.
      </p>
      <p className="mt-3">
        They may retain your information in accordance with their business practices and legal requirements.
      </p>
    </div>

    {/* Sharing List */}
    <div className="text-gray-900 text-sm leading-relaxed">
      <p className="font-semibold mb-2 select-none">You're sharing:</p>
      <ul className="list-disc list-inside space-y-1">
        <li>Victorian driver licence photo</li>
        <li>Full name, birth date and address</li>
        <li>Licence number, type and expiry date</li>
        <li>Licence status</li>
        <li>Proficiency</li>
      </ul>
    </div>
  </div>
)}

          {/* NAV */}
          {screen !== "pin" && screen !== "details" && (
  <div className="fixed bottom-0 left-0 right-0 max-w-[375px] mx-auto bg-white border-t flex justify-around py-2 select-none">
    <div className="flex flex-col items-center gap-1 cursor-pointer">
      <img src={vicLogo} alt="Home icon" className="w-6 h-6 opacity-100" />
      <span className="text-xs font-medium text-[#001628]">Home</span>
    </div>
    <div className="flex flex-col items-center gap-1 cursor-pointer opacity-60 hover:opacity-100 transition">
      <Car size={20} />
      <span className="text-xs text-gray-600">Vehicles</span>
    </div>
    <div className="flex flex-col items-center gap-1 cursor-pointer opacity-60 hover:opacity-100 transition">
      <CreditCard size={20} />
      <span className="text-xs text-gray-600">Licence</span>
    </div>
    <div className="flex flex-col items-center gap-1 cursor-pointer opacity-60 hover:opacity-100 transition">
      <DollarSign size={20} />
      <span className="text-xs text-gray-600">Payments</span>
    </div>
    <div className="flex flex-col items-center gap-1 cursor-pointer opacity-60 hover:opacity-100 transition" onClick={() => setScreen("profile")}>
      <User size={20} />
      <span className="text-xs text-gray-600">Profile</span>
    </div>
  </div>
)}
        </>
      )}
        </>
  );
};


export default App;

