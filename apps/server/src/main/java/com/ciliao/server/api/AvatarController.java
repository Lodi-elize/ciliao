package com.ciliao.server.api;

import com.ciliao.server.api.Dto.UserEnvelope;
import com.ciliao.server.config.StorageProperties;
import com.ciliao.server.domain.UserEntity;
import com.ciliao.server.service.AppException;
import com.ciliao.server.service.ChatService;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class AvatarController {
  private static final SecureRandom RANDOM = new SecureRandom();
  private static final Map<String, String> EXTENSIONS = Map.of(
      MediaType.IMAGE_JPEG_VALUE, ".jpg",
      MediaType.IMAGE_PNG_VALUE, ".png",
      "image/webp", ".webp");

  private final ChatService service;
  private final StorageProperties storage;

  public AvatarController(ChatService service, StorageProperties storage) {
    this.service = service;
    this.storage = storage;
  }

  @PostMapping(path = "/auth/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  UserEnvelope upload(HttpServletRequest request, @RequestParam("file") MultipartFile file) throws IOException {
    UserEntity user = ApiSupport.requireAuth(request, service);
    if (file == null || file.isEmpty()) {
      throw new AppException("请选择头像文件。", 400, "AVATAR_REQUIRED");
    }
    String contentType = file.getContentType();
    String extension = EXTENSIONS.get(contentType);
    if (extension == null) {
      throw new AppException("头像只支持 JPEG、PNG 或 WebP。", 400, "AVATAR_TYPE_UNSUPPORTED");
    }
    if (file.getSize() > 2 * 1024 * 1024) {
      throw new AppException("头像文件不能超过 2MB。", 400, "AVATAR_TOO_LARGE");
    }
    Path dir = Path.of(storage.getAvatarDir()).toAbsolutePath().normalize();
    Files.createDirectories(dir);
    String filename = user.getId().replaceAll("[^a-zA-Z0-9_-]", "_") + "-" + randomHex(12) + extension;
    Path target = dir.resolve(filename).normalize();
    if (!target.startsWith(dir)) {
      throw new AppException("头像路径无效。", 400, "AVATAR_PATH_INVALID");
    }
    file.transferTo(target);
    return new UserEnvelope(service.updateAvatar(user.getId(), "/uploads/avatars/" + filename));
  }

  private static String randomHex(int byteLength) {
    byte[] bytes = new byte[byteLength];
    RANDOM.nextBytes(bytes);
    return HexFormat.of().formatHex(bytes);
  }
}
