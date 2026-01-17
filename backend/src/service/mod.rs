//! Service installation and management for Ralphtown
//!
//! This module provides functionality to install, uninstall, start, stop, and
//! check the status of Ralphtown as a system service across platforms:
//! - macOS: LaunchAgent (user-level)
//! - Linux: systemd user service
//! - Windows: Windows Service

use service_manager::{
    RestartPolicy, ServiceInstallCtx, ServiceLabel, ServiceManager, ServiceStartCtx,
    ServiceStopCtx, ServiceUninstallCtx,
};
use std::ffi::OsString;
use std::path::PathBuf;
use thiserror::Error;

/// Service label for different platforms
const SERVICE_LABEL: &str = "com.ralphtown.server";

#[derive(Error, Debug)]
pub enum ServiceError {
    #[error("Failed to detect service manager: {0}")]
    NoServiceManager(String),

    #[error("Service operation failed: {0}")]
    OperationFailed(String),

    #[error("Could not find current executable: {0}")]
    ExecutableNotFound(String),
}

/// Service status information
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ServiceStatus {
    /// Service is installed and running
    Running,
    /// Service is installed but not running
    Stopped,
    /// Service is not installed
    NotInstalled,
    /// Status could not be determined
    Unknown,
}

impl std::fmt::Display for ServiceStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ServiceStatus::Running => write!(f, "running"),
            ServiceStatus::Stopped => write!(f, "stopped"),
            ServiceStatus::NotInstalled => write!(f, "not_installed"),
            ServiceStatus::Unknown => write!(f, "unknown"),
        }
    }
}

/// Controller for managing the Ralphtown service
pub struct ServiceController {
    label: ServiceLabel,
}

impl ServiceController {
    /// Create a new service controller
    pub fn new() -> Self {
        Self {
            label: SERVICE_LABEL.parse().expect("Invalid service label"),
        }
    }

    /// Get the native service manager for this platform
    fn get_manager(&self) -> Result<Box<dyn ServiceManager>, ServiceError> {
        <dyn ServiceManager>::native()
            .map_err(|e| ServiceError::NoServiceManager(e.to_string()))
    }

    /// Get the path to the current executable
    fn get_executable_path(&self) -> Result<PathBuf, ServiceError> {
        std::env::current_exe()
            .map_err(|e| ServiceError::ExecutableNotFound(e.to_string()))
    }

    /// Install Ralphtown as a system service
    pub fn install(&self) -> Result<(), ServiceError> {
        let manager = self.get_manager()?;
        let program = self.get_executable_path()?;

        // Set to user-level service if supported (macOS LaunchAgent, systemd --user)
        #[allow(unused_mut)]
        let mut manager = manager;
        let _ = manager.set_level(service_manager::ServiceLevel::User);

        manager
            .install(ServiceInstallCtx {
                label: self.label.clone(),
                program,
                args: vec![OsString::from("serve")],
                contents: None,
                username: None,
                working_directory: None,
                environment: None,
                autostart: true,
                restart_policy: RestartPolicy::OnFailure { delay_secs: Some(5) },
            })
            .map_err(|e| ServiceError::OperationFailed(format!("install: {}", e)))?;

        tracing::info!("Service installed successfully");
        Ok(())
    }

    /// Uninstall the Ralphtown service
    pub fn uninstall(&self) -> Result<(), ServiceError> {
        let manager = self.get_manager()?;

        // Set to user-level service if supported
        #[allow(unused_mut)]
        let mut manager = manager;
        let _ = manager.set_level(service_manager::ServiceLevel::User);

        // Try to stop the service first (ignore errors if not running)
        let _ = manager.stop(ServiceStopCtx {
            label: self.label.clone(),
        });

        manager
            .uninstall(ServiceUninstallCtx {
                label: self.label.clone(),
            })
            .map_err(|e| ServiceError::OperationFailed(format!("uninstall: {}", e)))?;

        tracing::info!("Service uninstalled successfully");
        Ok(())
    }

    /// Start the Ralphtown service
    pub fn start(&self) -> Result<(), ServiceError> {
        let manager = self.get_manager()?;

        // Set to user-level service if supported
        #[allow(unused_mut)]
        let mut manager = manager;
        let _ = manager.set_level(service_manager::ServiceLevel::User);

        manager
            .start(ServiceStartCtx {
                label: self.label.clone(),
            })
            .map_err(|e| ServiceError::OperationFailed(format!("start: {}", e)))?;

        tracing::info!("Service started successfully");
        Ok(())
    }

    /// Stop the Ralphtown service
    pub fn stop(&self) -> Result<(), ServiceError> {
        let manager = self.get_manager()?;

        // Set to user-level service if supported
        #[allow(unused_mut)]
        let mut manager = manager;
        let _ = manager.set_level(service_manager::ServiceLevel::User);

        manager
            .stop(ServiceStopCtx {
                label: self.label.clone(),
            })
            .map_err(|e| ServiceError::OperationFailed(format!("stop: {}", e)))?;

        tracing::info!("Service stopped successfully");
        Ok(())
    }

    /// Get the current status of the Ralphtown service
    pub fn status(&self) -> ServiceStatus {
        // Check if service is installed by looking for platform-specific indicators
        #[cfg(target_os = "macos")]
        {
            self.macos_status()
        }

        #[cfg(target_os = "linux")]
        {
            self.linux_status()
        }

        #[cfg(target_os = "windows")]
        {
            self.windows_status()
        }

        #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
        {
            ServiceStatus::Unknown
        }
    }

    #[cfg(target_os = "macos")]
    fn macos_status(&self) -> ServiceStatus {
        use std::process::Command;

        // Check LaunchAgent plist exists
        let home = match dirs::home_dir() {
            Some(h) => h,
            None => return ServiceStatus::Unknown,
        };
        let plist_path = home
            .join("Library/LaunchAgents")
            .join(format!("{}.plist", SERVICE_LABEL));

        if !plist_path.exists() {
            return ServiceStatus::NotInstalled;
        }

        // Use launchctl to check if running
        let output = Command::new("launchctl")
            .args(["list", SERVICE_LABEL])
            .output();

        match output {
            Ok(out) if out.status.success() => ServiceStatus::Running,
            _ => ServiceStatus::Stopped,
        }
    }

    #[cfg(target_os = "linux")]
    fn linux_status(&self) -> ServiceStatus {
        use std::process::Command;

        // Check systemd user service
        let output = Command::new("systemctl")
            .args(["--user", "is-active", "ralphtown"])
            .output();

        match output {
            Ok(out) => {
                let status = String::from_utf8_lossy(&out.stdout).trim().to_string();
                match status.as_str() {
                    "active" => ServiceStatus::Running,
                    "inactive" | "failed" => ServiceStatus::Stopped,
                    _ => {
                        // Check if service file exists
                        let config_dir = match dirs::config_dir() {
                            Some(d) => d,
                            None => return ServiceStatus::Unknown,
                        };
                        let service_path = config_dir.join("systemd/user/ralphtown.service");
                        if service_path.exists() {
                            ServiceStatus::Stopped
                        } else {
                            ServiceStatus::NotInstalled
                        }
                    }
                }
            }
            Err(_) => ServiceStatus::Unknown,
        }
    }

    #[cfg(target_os = "windows")]
    fn windows_status(&self) -> ServiceStatus {
        use std::process::Command;

        let output = Command::new("sc")
            .args(["query", "Ralphtown"])
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout);
                if stdout.contains("RUNNING") {
                    ServiceStatus::Running
                } else if stdout.contains("STOPPED") {
                    ServiceStatus::Stopped
                } else if !out.status.success() {
                    ServiceStatus::NotInstalled
                } else {
                    ServiceStatus::Unknown
                }
            }
            Err(_) => ServiceStatus::Unknown,
        }
    }

    /// Get the service label
    pub fn label(&self) -> &str {
        SERVICE_LABEL
    }
}

impl Default for ServiceController {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_controller_creation() {
        let controller = ServiceController::new();
        assert_eq!(controller.label(), SERVICE_LABEL);
    }

    #[test]
    fn test_service_status_display() {
        assert_eq!(ServiceStatus::Running.to_string(), "running");
        assert_eq!(ServiceStatus::Stopped.to_string(), "stopped");
        assert_eq!(ServiceStatus::NotInstalled.to_string(), "not_installed");
        assert_eq!(ServiceStatus::Unknown.to_string(), "unknown");
    }

    #[test]
    fn test_get_executable_path() {
        let controller = ServiceController::new();
        let path = controller.get_executable_path();
        assert!(path.is_ok());
    }
}
