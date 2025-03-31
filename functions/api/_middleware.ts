export async function onRequest(context: any) {
      const response = await context.next();
      response.headers.set(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self' data: https:; media-src 'self' https:;"
      );
      return response;
}
