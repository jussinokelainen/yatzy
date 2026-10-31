# syntax=docker/dockerfile:1

# The rust server is compiled as a static musl binary so that it can
# run on the small alpine image of the final stage
FROM rust:alpine AS server-builder
WORKDIR /build
RUN apk add --no-cache gcc musl-dev
COPY server ./server
RUN --mount=type=cache,target=/build/server/target \
	--mount=type=cache,target=/usr/local/cargo/registry \
	cargo build --release --manifest-path server/Cargo.toml && \
	cp server/target/release/server /server

FROM alpine:latest
COPY --from=server-builder /server ./server
COPY web/dist ./web/dist
EXPOSE 2222
CMD ["./server"]
