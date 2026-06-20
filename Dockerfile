FROM alpine:latest
COPY bin/server .
COPY web/dist ./web/dist
EXPOSE 2222
CMD ["./server"]
