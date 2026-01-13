FROM alpine:latest
COPY server/server .
COPY web/dist ./web/dist
EXPOSE 2222
CMD ["./server"]
