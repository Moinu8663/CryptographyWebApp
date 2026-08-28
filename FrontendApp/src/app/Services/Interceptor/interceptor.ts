import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Crypto } from '@moin8663/doublecrypto';
import { map } from 'rxjs';
import { environment } from '../../Environment/environment';

export const Interceptor: HttpInterceptorFn = (req, next) => {
  const masterkey = environment.masterkey;
  const crypto = new Crypto(masterkey);

  // Encrypt request bodies before sending them to the API.
  let modifiedRequest: typeof req;

  if (req.body == null) {
    modifiedRequest = req;
  } else if (req.body instanceof FormData) {
    const encryptedForm = new FormData();
    req.body.forEach((value, key) => {
      if (value instanceof File) {
        encryptedForm.append(key, value, value.name);
      } else {
        encryptedForm.append(key, crypto.doubleEncrypt(value));
      }
    });
    modifiedRequest = req.clone({ body: encryptedForm });
  } else {
    modifiedRequest = req.clone({ body: { data: crypto.doubleEncrypt(req.body) } });
  }

  return next(modifiedRequest).pipe(
    map((event) => {
      // Decrypt encrypted API responses.
      if (event instanceof HttpResponse && event.body) {
        try {
          const body = event.body as any;
          const decrypted = crypto.doubleDecrypt<any>(body.data);

          return event.clone({
            body: decrypted
          });
        } catch (error) {
          console.error('Decryption failed:', error);
          return event;
        }
      }

      return event;
    })
  );
};
