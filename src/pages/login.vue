<template>
  <div class="page-login d-flex">
    <div class="login-left">
      <v-btn text color="transparent" href="https://4everland.org/" class="always-active mt-6 ml-10">
        <logo />
      </v-btn>
      <v-img class="left-img" src="@/assets/imgs/login/left-img.png""></v-img>
        </div>
        <div class=" right-main">
        <app-header />
        <div class="right-content">
          <v-container>
            <v-row>
              <v-col cols="12" class="ma-auto">
                <div class="text-left text-h4 font-bold font-weight-bold mb-6" style="color: #0E0E2C">
                  Connect your wallet
                </div>

                <div class="wallet">
                  <!-- <div class=" text-body-2 mb-3" style="color: #8C8CA1">
                    Connect your wallet
                  </div> -->
                  <login-wallet ref="wallet" @walletVerify="onVerify"></login-wallet>
                  <!-- <div class="line"></div> -->
                  <hr class="divider">
                  </hr>
                  <!-- <div class="or">Or</div> -->
                  <!-- <v-btn
              block
              :elevation="0"
              class="github-btn"
              @click="onVerify('github')"
            >
              <v-icon class="mr-4"> mdi-github </v-icon>
              Continue with GitHub</v-btn
            > -->
                  <div class="wallet-item" @click="onVerify('github')">
                    <div class="wallet-item-name">
                      <img src="@/assets/imgs/icon_github.png" alt="" />
                      <span class="name">Continue with GitHub</span>
                    </div>
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-container>

        </div>

    </div>

    <v-dialog v-model="gitOverlay" width="500">
      <div class="connect-box pa-14">
        <div class="text-caption grey--text text--darken-2 mb-7">
          Github has been disabled for new users, please login with your wallet
          instead.
        </div>
        <v-btn class="start-btn text-subtitle-1 font-weight-black px-10 white--text"
          @click="gitOverlay = false">OK</v-btn>
      </div>
    </v-dialog>
    <v-dialog v-model="lockOverlay" width="500">
      <div class="connect-box pa-14">
        <div class="text-caption grey--text text--darken-2 mb-7">
          Metamask is locked, please open the extension before continuing.
        </div>
        <v-btn class="start-btn text-subtitle-1 font-weight-black px-10 white--text"
          @click="lockOverlay = false">RETRY</v-btn>
      </div>
    </v-dialog>
    <div id="grecaptcha" data-callback="onSubmit" data-size="invisible"></div>
  </div>
</template>

<script>
import * as fcl from "@onflow/fcl";
import AppHeader from "@/views/login/AppHeader.vue";
import AppFooter from "@/views/login/AppFooter.vue";
import LoginWallet from "@/views/login/login-wallet.vue";
import Logo from "@/views/login/Logo";

const authApi = process.env.VUE_APP_AUTH_URL;
export default {
  name: "Home",
  components: { AppHeader, AppFooter, LoginWallet, Logo },
  data() {
    return {
      connectOverlay: false,
      gitOverlay: false,
      lockOverlay: false,
      accounts: "",
      inviteCode: null,
      dialogShow: false,
      sitekey: "6LdPnxclAAAAACTzYeZDztp3dcCKFUIG_5r313JV",
      grecaptchaSwitch: false,
    };
  },
  created() {
    if (localStorage.token) {
      this.$router.replace("/");
    }
  },
  mounted() {
    const { code, inviteCode, loginTo } = this.$route.query;
    if (loginTo) {
      localStorage.loginTo = loginTo;
    }
    if (inviteCode) {
      this.inviteCode = inviteCode;
    }
    if (code) {
      this.getAuth(code);
    }
    this.loaded();
  },
  methods: {
    async onLogin(token) {
      this.$loading();
      try {
        const params = {
          platform: "github",
          appName: "BUCKET",
          entrance: 2,
          inviteCode: this.inviteCode,
          capT: token,
        };
        const { data } = await this.$axios.get(`${authApi}/login`, {
          params,
        });
        location.href = data.data.login_url;
      } catch (error) {
        console.log(error);
      }
    },
    async getAuth(code) {
      this.$loading();
      try {
        const res = await this.$http.post(
          `/auth/${code}`,
          {
            inviteCode: this.inviteCode,
          },
          {
            params: {
              _auth: 1,
            },
          }
        );
        if (res.code === 430) {
          this.gitOverlay = true;
        }
        if (res.code === 200 && res.data.stoken) {
          const stoken = res.data.stoken;
          if (stoken) {
            this.$refs.wallet.ssoLogin(stoken);
          }
        }
      } catch (error) {
        console.log(error);
      }
    },

    async signMessage() {
      const MSG = Buffer.from("FOO").toString("hex");
      try {
        return await fcl.currentUser.signUserMessage(MSG);
      } catch (error) {
        console.log(error);
      }
    },
    onVerify(name) {
      this.walletName = name;
      if (this.grecaptchaSwitch) {
        window.grecaptcha.execute();
      } else {
        this.submit();
      }
    },
    submit(token) {
      if (this.walletName == "github") {
        this.onLogin(token);
      } else {
        this.$refs.wallet.connect(this.walletName, token);
      }
      if (this.grecaptchaSwitch) {
        window.grecaptcha.reset();
      }
    },
    loaded() {
      if (this.grecaptchaSwitch) {
        setTimeout(() => {
          window.grecaptcha.render("grecaptcha", {
            sitekey: this.sitekey,
            callback: this.submit,
          });
        }, 200);
      }
    },
  },
};
</script>

<style lang="scss">
.page-login {
  background-color: #fff;
  height: 100%;

  .login-left {
    flex-grow: 0;
    position: relative;
    width: 512px;
    background-image: url("../assets/imgs/login/left-bg.png");
    background-size: 100% 100%;

    .left-img {
      width: 90%;
      position: absolute;
      right: 0;
      bottom: 40px;
    }
  }

  .right-main {
    height: calc(100% - 80px);
    flex-grow: 1;

    .right-content {
      max-width: 480px;
      height: 100%;
      display: flex;
      -ms-flex-positive: 1;
      flex-grow: 1;
      -ms-flex-align: center;
      align-items: center;
      -ms-flex-pack: center;
      justify-content: center;
      margin: 0 auto;
      padding: 0;
    }
  }

  .wallet {
    width: 100%;
    max-width: 480px;

    .line {
      width: 112px;
      height: 1px;
      border-bottom: 1px solid #e6e8eb;
      margin: 0 auto;
      margin-top: 24px;
    }

    hr.divider {
      margin: 24px 0;
      padding: 0;
      overflow: visible;
      border: none;
      border-top: 1px solid #e0e0e0;
      color: #6e6d7a;
      text-align: center;
    }

    hr.divider:after {
      content: 'Or';
      display: inline-block;
      position: relative;
      top: -12px;
      padding: 0 16px;
      background: #fff;
      font: normal 14px/14px "Haas Grot Text R Web", "Helvetica Neue", Helvetica, Arial, sans-serif;
    }

    .or {
      margin-top: 32px;
      color: #8C8CA1;
      font-size: 14px;
    }

    .wallet-item {
      width: 100%;
      max-width: 480px;
      height: 56px;
      background: rgba(140, 140, 161, 0.05);
      border-radius: 8px;
      margin: 0 auto;
      margin-top: 12px;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;

      &:last-child {
        border-bottom: none;
      }

      &-name {
        display: flex;
        align-items: center;
      }

      img {
        width: 32px;
        margin-right: 16px;
      }

      .name {
        font-size: 16px;
        font-family: Arial-BoldMT, Arial;
        font-weight: normal;
        color: #495667;
      }

      .item-name {
        display: inline-block;
        color: #735ea1;
        font-size: 10px;
        text-align: center;
        padding: 4px 8px;
      }

      .item-name-pop {
        background: linear-gradient(270deg, #735ea1 0%, #9747ff 100%);
        border-radius: 8px 0px;
        color: #fff;
      }

      .start-btn {
        color: #3eadff;
        border-radius: 6px;
      }

      &:first-child .start-btn {
        color: #fff;
      }
    }

    .github-btn {
      width: 100%;
      max-width: 480px;
      height: 56px;
      background: rgba(140, 140, 161, 0.05);
      border-radius: 8px;
      color: #0E0E2C;
      margin: 0 auto;
      margin-top: 12px;
      font-size: 16px;
    }
  }
}

.connect-box {
  width: 500px;
  min-height: 200px;
  background-color: #fff;
  border-radius: 15px;
  text-align: center;
  margin: 0 auto;

  .start-btn {
    background: linear-gradient(90deg, #fdb6fe, #acc0fd, #31adfe);
    border-radius: 44px;
  }
}

@media screen and (max-width: 960px) {
  .login-left {
    display: none;
  }
}</style>
