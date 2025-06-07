import React, { useState, useEffect } from "react"

const IndexPopup = () => {
  const [apiKey, setApiKey] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  // Load existing API key on mount
  useEffect(() => {
    loadApiKey()
  }, [])

  const loadApiKey = async () => {
    try {
      const result = await chrome.storage.local.get("OPENAI_API_KEY")
      if (result.OPENAI_API_KEY) {
        setApiKey(result.OPENAI_API_KEY)
      }
    } catch (error) {
      console.error("Failed to load API key:", error)
    }
  }

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setMessage("Please enter a valid API key")
      return
    }

    if (!apiKey.startsWith("sk-")) {
      setMessage("API key should start with 'sk-'")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      await chrome.storage.local.set({ OPENAI_API_KEY: apiKey.trim() })
      setMessage("✅ API key saved successfully!")
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(""), 3000)
    } catch (error) {
      console.error("Failed to save API key:", error)
      setMessage("❌ Failed to save API key")
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    try {
      await chrome.storage.local.remove("OPENAI_API_KEY")
      setApiKey("")
      setMessage("✅ API key cleared")
      setTimeout(() => setMessage(""), 3000)
    } catch (error) {
      console.error("Failed to clear API key:", error)
      setMessage("❌ Failed to clear API key")
    }
  }

  return (
    <div style={{ 
      width: "350px", 
      padding: "20px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      minHeight: "200px"
    }}>
      <h2 style={{ 
        margin: "0 0 20px 0",
        fontSize: "18px",
        fontWeight: "600"
      }}>
        n8n Flow Settings
      </h2>
      
      <div style={{ marginBottom: "20px" }}>
        <label style={{ 
          display: "block",
          marginBottom: "8px",
          fontSize: "14px",
          fontWeight: "500"
        }}>
          OpenAI API Key:
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            backgroundColor: "rgba(255,255,255,0.9)",
            color: "#333",
            outline: "none",
            boxSizing: "border-box"
          }}
        />
      </div>

      <div style={{ 
        display: "flex", 
        gap: "10px", 
        marginBottom: "15px" 
      }}>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            flex: 1,
            backgroundColor: loading ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)",
            color: "white",
            padding: "10px 16px",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.2s ease"
          }}
        >
          {loading ? "Saving..." : "Save API Key"}
        </button>

        <button
          onClick={handleClear}
          disabled={loading}
          style={{
            backgroundColor: "rgba(255,255,255,0.1)",
            color: "white",
            padding: "10px 16px",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.2s ease"
          }}
        >
          Clear
        </button>
      </div>

      {message && (
        <div style={{ 
          padding: "10px 12px",
          backgroundColor: "rgba(255,255,255,0.1)",
          borderRadius: "8px",
          fontSize: "14px",
          color: message.includes("✅") ? "#90EE90" : "#FFB6C1",
          border: `1px solid ${message.includes("✅") ? "rgba(144,238,144,0.3)" : "rgba(255,182,193,0.3)"}`,
          animation: "fadeIn 0.3s ease"
        }}>
          {message}
        </div>
      )}

      <div style={{
        marginTop: "20px",
        fontSize: "12px",
        color: "rgba(255,255,255,0.7)",
        lineHeight: "1.4"
      }}>
        <p>💡 Get your API key from <strong>platform.openai.com</strong></p>
        <p>🔒 Your key is stored locally in your browser</p>
      </div>
    </div>
  )
}

export default IndexPopup 