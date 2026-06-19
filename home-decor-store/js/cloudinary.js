// Cloudinary Direct Image Upload Module

// Helper to check if Cloudinary is configured
export function getCloudinarySettings() {
  const cloudName = localStorage.getItem("AURA_DECOR_CLOUDINARY_CLOUD_NAME") || "";
  const uploadPreset = localStorage.getItem("AURA_DECOR_CLOUDINARY_UPLOAD_PRESET") || "";
  return { cloudName, uploadPreset };
}

export function saveCloudinarySettings(cloudName, uploadPreset) {
  if (cloudName && uploadPreset) {
    localStorage.setItem("AURA_DECOR_CLOUDINARY_CLOUD_NAME", cloudName);
    localStorage.setItem("AURA_DECOR_CLOUDINARY_UPLOAD_PRESET", uploadPreset);
    return true;
  }
  return false;
}

export function isCloudinaryConfigured() {
  const { cloudName, uploadPreset } = getCloudinarySettings();
  return cloudName && cloudName !== "YOUR_CLOUD_NAME" && 
         uploadPreset && uploadPreset !== "YOUR_UPLOAD_PRESET";
}

/**
 * Uploads a file to Cloudinary using unsigned upload presets
 * @param {File} file - The file object from input type="file"
 * @returns {Promise<string>} The uploaded image secure URL
 */
export async function uploadImage(file) {
  if (!isCloudinaryConfigured()) {
    console.warn("Cloudinary not configured. Using local preview object URL as fallback.");
    // In local demo mode, create a temporary Object URL so the image displays in the current session
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // We resolve with base64 so it can be saved in local storage and persist!
        resolve(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  const { cloudName, uploadPreset } = getCloudinarySettings();
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Cloudinary upload failed.");
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary upload request failed:", error);
    throw new Error("Could not upload image. Please check your Cloudinary configuration: " + error.message);
  }
}
