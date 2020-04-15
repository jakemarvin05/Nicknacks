<style scoped>
.layout{
    border: 1px solid #d7dde4;
    background: #f5f7f9;
    position: relative;
    border-radius: 4px;
    overflow: hidden;
}
#loginFormWrapperOuter {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}
#loginFormWrapperInner {
    width: 280px;
    text-align: center;
}
</style>

<template>
    <div class="layout">
        <div v-if="$route.name === 'ForgetPasswordReset'">
            <router-view></router-view>
        </div>
        <div v-else>
            <Spin size="large" fix v-if="spinShow"></Spin>
            <div id="loginFormWrapperOuter">
                <div id="loginFormWrapperInner">
                    <Form ref="form" :model="form" :rules="ruleInline">
                        <FormItem prop="user">
                            <Row>
                                <Input type="text" v-model="form.user" placeholder="Email">
                                    <Icon type="ios-person-outline" slot="prepend"></Icon>
                                </Input>
                            </Row>
                        </FormItem>
                        <FormItem prop="password">
                            <Input type="password" v-model="form.password" placeholder="Password">
                                <Icon type="ios-lock-outline" slot="prepend"></Icon>
                            </Input>
                        </FormItem>
                        <FormItem>
                            <Button :loading="submitFormButtonLoading" type="primary" @click="handleSubmit('form')">Signin</Button>
                        </FormItem>
                    </Form>

                    <a href="javascript:void(0);" @click="openForgetPasswordModal()">Forget password</a>
                </div>

                <Modal
                    v-model="modal.show"
                    :loading="modal.loading"
                    @on-ok="submitForgetPassword()"
                    title="Enter your username"
                >
                    <Form ref="forgetPasswordForm" :model="form" :rules="ruleInline">
                        <FormItem prop="user">
                            <Row>
                                <Input type="text" v-model="form.user" placeholder="Email">
                                    <Icon type="ios-person-outline" slot="prepend"></Icon>
                                </Input>
                            </Row>
                        </FormItem>
                    </Form>

                    <span>Note: After pressing "ok", an email with a reset link will be sent to your mailbox</span>

                </Modal>

            </div>
        </div>
    </div>
</template>
<script>

import D from 'dottie'
import loginForm from './components/login/login-form'
const domain = process.env.API_DOMAIN

export default {
    components: {
        loginForm
    },
    data () {
        return {
            spinShow: false,
            modal: {
                show: false,
                loading: true
            },
            form: {
                user: '',
                password: ''
            },
            submitFormButtonLoading: false,
            ruleInline: {
                user: [
                    { required: true, message: 'Username email cannot be empty', trigger: 'blur' },
                    { type: 'email', message: 'Incorrect email format', trigger: 'blur'}
                ],
                password: [
                    { required: true, message: 'Please fill in the password.', trigger: 'blur' },
                    { type: 'string', min: 6, message: 'The password length cannot be less than 6 bits', trigger: 'blur' }
                ]
            }
        }
    },
    methods: {
        handleSubmit(name) {
            let self = this
            this.submitFormButtonLoading = true

            this.$refs[name].validate((valid) => {
                if (!valid) {
                    this.$Message.error('Please check your inputs!')
                    this.submitFormButtonLoading = false
                    return
                }

                setTimeout(function() {
                    self.$Message.error('Failed to login! Please try again.')
                    self.submitFormButtonLoading = false
                }, 5000)

            })
        },
        openForgetPasswordModal() {
            this.modal.show = true
        },
        submitForgetPassword() {
            let self = this

            this.$refs["forgetPasswordForm"].validate((valid) => {
                if (!valid) {
                    this.$Message.error('Please check your inputs!')
                    this.modal.loading = false
                    setTimeout(() => { self.modal.loading = true }, 1)
                    return
                }

                let payload = {
                    email: self.form.user
                }

                this.AXIOS.post(this.DOMAIN + '/api/v2/login/password/forget', payload).then(response => {
                    if (!response.data.success) {
                        let error = new Error('API operation not successful.')
                        error.response = response
                        throw error
                    }
                    // this.$store.state.authenticated()
                    this.$Message.success({
                        content: 'If your email is valid, a link to reset your password will be sent!',
                        duration: 10,
                        closable: true
                    })
                    this.modal.show = false

                }).catch(error => {

                    CATCH_ERR_HANDLER(error)
                    this.$Message.error('Failed request!')

                }).then(() => {
                    this.modal.loading = false
                    setTimeout(() => { self.modal.loading = true }, 1)
                })
            })
        }
    },
    created () {}
}
</script>
