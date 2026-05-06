package com.ciliao.server.config;

import java.nio.file.Path;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
  private final StorageProperties storage;

  public WebConfig(StorageProperties storage) {
    this.storage = storage;
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/**").allowedOriginPatterns("*").allowedMethods("*").allowedHeaders("*");
  }

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    Path avatarPath = Path.of(storage.getAvatarDir()).toAbsolutePath().normalize();
    registry.addResourceHandler("/uploads/avatars/**").addResourceLocations(avatarPath.toUri().toString() + "/");
  }
}
