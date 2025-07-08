import { createRemoteJWKSet, jwtVerify } from 'jose';
import { NextResponse, type NextRequest } from 'next/server';

// 環境変数の読み込み
const cognitoRegion = process.env.NEXT_PUBLIC_COGNITO_REGION!;
const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!;
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;

// リダイレクト先のログインURL (basePathを含む)
const loginUrl = '/web/auth/login';

const jwksUri = `https://cognito-idp.${cognitoRegion}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
const JWKS = createRemoteJWKSet(new URL(jwksUri));

export async function middleware(request: NextRequest) {
  // ルートパス('/')へのアクセスであれば、ログインページへリダイレクト
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  // Cookieからトークンを取得
  const token = request.cookies.get('auth_token')?.value;

  // トークンがなければログインページへリダイレクト
  if (!token) {
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  // トークンを検証
  try {
    await jwtVerify(token, JWKS, {
      issuer: `https://cognito-idp.${cognitoRegion}.amazonaws.com/${userPoolId}`,
      audience: clientId,
    });
    // 検証に成功した場合、要求されたページへのアクセスを許可
    return NextResponse.next();
  } catch (error) {
    console.error("JWT Verification Error:", error);
    // 検証に失敗した場合、ログインページへリダイレクト
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }
}

export const config = {
  /*
   * この一つの正規表現で、必要なパス（'/'や'/home'など）を対象にしつつ、
   * 不要なパス（api, _next, ログインページなど）を除外できます。
   * これが最もシンプルで確実な設定です。
   */
  matcher: [
	'/home/:path*',
    '/users/:path*',
	'/call/:path*',
  ],
};