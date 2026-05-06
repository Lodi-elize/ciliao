FROM eclipse-temurin:17-jre

WORKDIR /app

RUN addgroup --system ciliao && adduser --system --ingroup ciliao ciliao

COPY target/server-0.0.1-SNAPSHOT.jar /app/server.jar

RUN mkdir -p /app/uploads/avatars && chown -R ciliao:ciliao /app

USER ciliao

EXPOSE 4000

ENV PORT=4000
ENV CILIAO_AVATAR_DIR=/app/uploads/avatars

ENTRYPOINT ["java", "-jar", "/app/server.jar"]
