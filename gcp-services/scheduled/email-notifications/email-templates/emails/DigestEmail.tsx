import type { CSSProperties } from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

const primaryBlue = "#007BFF";
const primaryBlueLight = "#42A5F5";
const primaryBlueDark = "#1565C0";
const textColor = "#111827";
const textColorMuted = "#6B7280";
const backgroundColor = "#FFFFFF";
const borderColor = "#E5E7EB";
const fontStack = "'TASA Orbiter', 'Inter', 'Helvetica Neue', Arial, sans-serif";

export const PROJECT_SECTIONS_MARKER = "<!--PROJECT_SECTIONS-->";

export type DigestTemplateData = {
  previewText: string;
  userName: string;
  digestDateLabel: string;
  ctaUrl: string;
  managePrefsUrl: string;
  projectSectionsHtml: string;
};

const defaultTemplateData: DigestTemplateData = {
  previewText: "{{PREVIEW_TEXT}}",
  userName: "{{USER_NAME}}",
  digestDateLabel: "{{DIGEST_DATE}}",
  ctaUrl: "{{CTA_URL}}",
  managePrefsUrl: "{{MANAGE_PREFS_URL}}",
  projectSectionsHtml: PROJECT_SECTIONS_MARKER,
};

export default function DigestEmail(props: Partial<DigestTemplateData>) {
  const data: DigestTemplateData = { ...defaultTemplateData, ...props };

  return (
    <Html>
      <Head>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=TASA+Orbiter:wght@400;500;600;700&display=swap');
            @media screen and (max-width: 600px) {
              .container {
                width: 100% !important;
                padding: 20px !important;
                border-radius: 0 !important;
              }
              .content-wrapper {
                padding: 32px 24px !important;
              }
              .header-logo {
                width: 48px !important;
                height: auto !important;
              }
              .main-heading {
                font-size: 28px !important;
                line-height: 32px !important;
              }
              .subheading {
                font-size: 16px !important;
                line-height: 24px !important;
              }
              .hero {
                padding: 28px 20px !important;
                border-radius: 12px !important;
              }
              .hero-copy {
                font-size: 17px !important;
                line-height: 26px !important;
              }
              .cta-section {
                padding: 0 !important;
                margin: 0 0 24px 0 !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              .cta-section td {
                padding: 0 !important;
                width: 100% !important;
              }
              .cta-button {
                width: 100% !important;
                max-width: 100% !important;
                padding: 16px 20px !important;
                display: block !important;
                box-sizing: border-box !important;
                text-align: center !important;
              }
            }
          `}
        </style>
      </Head>
      <Preview>{data.previewText}</Preview>
      <Body style={body}>
        <Container style={container} className="container">
          {/* Header with Logo */}
          <Section style={headerSection}>
            <table
              align="center"
              width="100%"
              border={0}
              cellPadding="0"
              cellSpacing="0"
              role="presentation"
              className="header-row"
              style={headerRow}
            >
              <tbody>
                <tr>
                  <td>
                    <table
                      align="center"
                      width="100%"
                      border={0}
                      cellPadding="0"
                      cellSpacing="0"
                      role="presentation"
                    >
                      <tbody style={innerTbody}>
                        <tr style={innerTr}>
                          <td align="center" colSpan={2} style={centeredCell}>
                            <table
                              border={0}
                              cellPadding="0"
                              cellSpacing="0"
                              role="presentation"
                              style={logoBrandRow}
                            >
                              <tr>
                                <td style={logoColumn}>
                                  <Img
                                    className="logo-img"
                                    alt="CapMatch"
                                    height={48}
                                    src="https://capmatch.com/CapMatchLogo.png"
                                    style={logo}
                                    width={48}
                                  />
                                </td>
                                <td style={brandSpacer} width="12"></td>
                                <td style={brandColumn}>
                                  <p style={brandText}>CAPMATCH</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={2} data-id="__react-email-column" style={headingCell}>
                            <Heading style={mainHeading} className="main-heading">
                              Daily Digest
                            </Heading>
                            <Text style={subheading} className="subheading">
                              Important activity across your projects.
                            </Text>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Main Content */}
          <Section style={contentWrapper} className="content-wrapper">

            {/* Hero Section */}
            <Section style={hero} className="hero">
              <Text style={heroCopy} className="hero-copy">
                Hey <span style={heroUser}>{data.userName}</span>, here&apos;s what happened on{" "}
                <strong>{data.digestDateLabel}</strong>.
              </Text>
            </Section>

          <Section>
            <div
              dangerouslySetInnerHTML={{
                __html: data.projectSectionsHtml,
              }}
            />
          </Section>

            <Section style={ctaSection} className="cta-section">
              <Link href={data.ctaUrl} style={ctaButton} className="cta-button">
                Open CapMatch →
              </Link>
            </Section>

            <Hr style={divider} />

            <Section style={footer}>
              <Text style={footerText}>
                You&apos;re receiving this email because digest alerts are enabled.{" "}
                <Link href={data.managePrefsUrl} style={footerLink}>
                  Manage preferences
                </Link>
                .
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body: CSSProperties = {
  backgroundColor: "#F9FAFB",
  padding: "0",
  fontFamily: fontStack,
  color: textColor,
  margin: "0",
};

const container: CSSProperties = {
  width: "100%",
  maxWidth: "600px",
  margin: "40px auto",
  backgroundColor: backgroundColor,
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
};

const headerSection: CSSProperties = {
  marginBottom: "32px",
  paddingTop: "32px",
};

const headerRow: CSSProperties = {
  marginBottom: "32px",
};

const innerTbody: CSSProperties = {
  width: "100%",
};

const innerTr: CSSProperties = {
  width: "100%",
};

const brandText: CSSProperties = {
  fontSize: "18px",
  lineHeight: "24px",
  letterSpacing: "0.4em",
  color: "#0F172A",
  margin: "0 0 8px 0",
  fontWeight: 600,
  marginTop: "0",
  marginRight: "0",
  marginBottom: "8px",
  marginLeft: "0",
};

const centeredCell: CSSProperties = {
  textAlign: "center",
};

const logoBrandRow: CSSProperties = {
  margin: "0 auto",
};

const logoColumn: CSSProperties = {
  textAlign: "left",
  verticalAlign: "middle",
};

const brandSpacer: CSSProperties = {
  width: "12px",
};

const brandColumn: CSSProperties = {
  verticalAlign: "middle",
  paddingTop: "8px",
};

const headingCell: CSSProperties = {
  paddingTop: "0",
};

const logo: CSSProperties = {
  display: "block",
  outline: "none",
  border: "none",
  textDecoration: "none",
  width: "60px",
  height: "48px",
};

const contentWrapper: CSSProperties = {
  padding: "0 48px 48px 48px",
  paddingTop: "0",
  backgroundColor: backgroundColor,
};

const mainHeading: CSSProperties = {
  fontSize: "36px",
  lineHeight: "40px",
  color: textColor,
  margin: "0 0 4px 0",
  fontWeight: 700,
  textAlign: "center",
  letterSpacing: "-0.02em",
};

const subheading: CSSProperties = {
  fontSize: "18px",
  lineHeight: "28px",
  color: textColorMuted,
  margin: "0",
  textAlign: "center",
  fontWeight: 400,
};

const hero: CSSProperties = {
  backgroundColor: "#F8FAFF",
  borderRadius: "12px",
  padding: "32px",
  margin: "0 0 32px 0",
  marginTop: "-4px",
  border: `1px solid ${borderColor}`,
  textAlign: "center",
};

const heroCopy: CSSProperties = {
  fontSize: "17px",
  lineHeight: "26px",
  color: textColor,
  margin: "0",
  fontWeight: 400,
};

const heroUser: CSSProperties = {
  color: textColor,
  fontWeight: 600,
};

const ctaSection: CSSProperties = {
  textAlign: "center",
  margin: "0 0 24px 0",
  width: "100%",
  maxWidth: "100%",
};

const ctaButton: CSSProperties = {
  backgroundColor: primaryBlue,
  color: "#000000",
  padding: "14px 32px",
  borderRadius: "8px",
  fontWeight: 600,
  textDecoration: "none",
  display: "inline-block",
  fontSize: "16px",
  lineHeight: "24px",
  transition: "background-color 0.2s ease",
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
  boxSizing: "border-box",
  maxWidth: "100%",
};

const ctaHint: CSSProperties = {
  color: textColor,
  fontSize: "13px",
  marginTop: "12px",
};

const divider: CSSProperties = {
  borderColor: borderColor,
  margin: "32px 0 24px 0",
  borderWidth: "1px",
};

const footer: CSSProperties = {
  textAlign: "center",
};

const footerText: CSSProperties = {
  fontSize: "13px",
  lineHeight: "20px",
  color: textColorMuted,
  margin: "0",
  textAlign: "center",
  fontWeight: 400,
};

const footerLink: CSSProperties = {
  color: primaryBlue,
  textDecoration: "none",
};

