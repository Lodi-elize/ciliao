package com.ciliao.server.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ciliao.upload")
public class StorageProperties {
  private String avatarDir;

  public String getAvatarDir() {
    return avatarDir;
  }

  public void setAvatarDir(String avatarDir) {
    this.avatarDir = avatarDir;
  }
}
